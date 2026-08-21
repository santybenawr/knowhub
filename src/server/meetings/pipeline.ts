import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { meetingAnalysis, meetingChunks, meetings } from '@/server/db/schema'
import { getStorageProvider } from '@/server/storage'
import { getTranscriptionProvider } from '@/server/transcription'
import { getAIProvider } from '@/server/ai'
import { chunkTranscriptSegments } from '@/server/ai/chunking'
import { embedTexts } from '@/server/ai/embeddings'
import { buildMeetingAnalysisMessages } from '@/server/ai/prompts'
import { meetingAnalysisSchema, pruneAnalysisEvidence } from '@/validations/meeting-analysis'
import { enqueueAndRun } from '@/server/jobs'
import { recordUsage } from '@/server/usage'
import { trackEvent } from '@/server/analytics'
import { notFound } from '@/lib/errors'
import { formatTranscriptForAnalysis, getResolvedTranscript, persistTranscription } from './transcript'

/**
 * §86 — Meeting processing pipeline.
 *
 *   audio → transcription → segments → analysis → chunks → embeddings → ready
 *
 * Each stage is a separate job so a failure is contained: a broken analysis
 * still leaves a readable transcript (§128), and missing embeddings still leave
 * a meeting you can open and play (§129).
 */

export async function transcribeMeeting(meetingId: string): Promise<void> {
  const db = await getDb()
  const rows = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1)
  const meeting = rows[0]
  if (!meeting) throw notFound('No encontramos esta reunión.')
  if (!meeting.audioStoragePath) throw notFound('Esta reunión no tiene audio para transcribir.')

  await db
    .update(meetings)
    .set({ transcriptionStatus: 'processing', transcriptionError: null, status: 'processing', updatedAt: new Date() })
    .where(eq(meetings.id, meetingId))

  try {
    const { body, mimeType } = await getStorageProvider().read(meeting.audioStoragePath)
    const provider = getTranscriptionProvider()
    const result = await provider.transcribe({
      audio: body,
      mimeType: meeting.audioMimeType ?? mimeType,
      filename: `${meetingId}.${extensionFromMime(meeting.audioMimeType ?? mimeType)}`,
      language: meeting.language ?? undefined,
    })

    await persistTranscription({ meetingId, workspaceId: meeting.workspaceId, result })

    const durationSeconds =
      meeting.durationSeconds ?? (result.durationSeconds ? Math.round(result.durationSeconds) : null)

    await db
      .update(meetings)
      .set({
        transcriptionStatus: 'completed',
        transcriptionError: null,
        language: meeting.language ?? result.language ?? null,
        durationSeconds,
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId))

    if (durationSeconds) {
      await recordUsage(meeting.workspaceId, 'transcription_minutes', durationSeconds / 60)
    }
    await trackEvent('transcription_completed', { workspaceId: meeting.workspaceId }, {
      segments: result.segments.length,
      provider: provider.name,
    })

    await enqueueAndRun({
      workspaceId: meeting.workspaceId,
      resourceType: 'meeting',
      resourceId: meetingId,
      type: 'meeting_analysis',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    // §127 — a failed transcription never deletes the audio.
    await db
      .update(meetings)
      .set({
        transcriptionStatus: 'failed',
        transcriptionError: message.slice(0, 1000),
        status: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId))
    throw err
  }
}

export async function analyzeMeeting(meetingId: string): Promise<void> {
  const db = await getDb()
  const rows = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1)
  const meeting = rows[0]
  if (!meeting) throw notFound('No encontramos esta reunión.')

  await db
    .update(meetings)
    .set({ analysisStatus: 'processing', analysisError: null, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId))

  try {
    const { segments } = await getResolvedTranscript(meetingId, meeting.workspaceId)
    if (segments.length === 0) throw notFound('Esta reunión no tiene transcripción para analizar.')

    const transcript = formatTranscriptForAnalysis(segments)
    const provider = getAIProvider()
    const { data, usage, model } = await provider.generateStructuredOutput({
      messages: buildMeetingAnalysisMessages({ title: meeting.title, transcript }),
      schema: meetingAnalysisSchema,
      schemaName: 'MeetingAnalysis',
    })

    // §182 — drop any evidence id the model produced that is not a real segment.
    const validIds = new Set(segments.map((s) => s.id))
    const analysis = pruneAnalysisEvidence(data, validIds)

    const payload = {
      meetingId,
      workspaceId: meeting.workspaceId,
      summary: analysis.summary,
      topics: analysis.topics,
      participants: analysis.participants,
      decisions: analysis.decisions,
      actionItems: analysis.actionItems,
      keyPoints: analysis.keyPoints,
      openQuestions: analysis.openQuestions,
      importantDates: analysis.importantDates,
      suggestedQuestions: analysis.suggestedQuestions,
      modelUsed: model,
      updatedAt: new Date(),
    }

    // §130 — one analysis row per meeting; a retry overwrites it.
    await db
      .insert(meetingAnalysis)
      .values(payload)
      .onConflictDoUpdate({ target: meetingAnalysis.meetingId, set: payload })

    await db
      .update(meetings)
      .set({ analysisStatus: 'completed', analysisError: null, updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))

    await recordUsage(meeting.workspaceId, 'generation_tokens', usage.outputTokens)
    await trackEvent('meeting_analysis_completed', { workspaceId: meeting.workspaceId }, {
      decisions: analysis.decisions.length,
      actionItems: analysis.actionItems.length,
    })

    await enqueueAndRun({
      workspaceId: meeting.workspaceId,
      resourceType: 'meeting',
      resourceId: meetingId,
      type: 'meeting_embedding',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await db
      .update(meetings)
      .set({ analysisStatus: 'failed', analysisError: message.slice(0, 1000), updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))

    // §128 — the transcript is still useful, so the meeting is still "ready".
    await enqueueAndRun({
      workspaceId: meeting.workspaceId,
      resourceType: 'meeting',
      resourceId: meetingId,
      type: 'meeting_embedding',
    })
    throw err
  }
}

/**
 * §31/§101 — Chunk the transcript into retrievable units that keep their time
 * span, speakers and segment ids, then embed them.
 */
export async function indexMeeting(meetingId: string): Promise<void> {
  const db = await getDb()
  const rows = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1)
  const meeting = rows[0]
  if (!meeting) throw notFound('No encontramos esta reunión.')

  await db
    .update(meetings)
    .set({ embeddingStatus: 'processing', embeddingError: null, updatedAt: new Date() })
    .where(eq(meetings.id, meetingId))

  try {
    const { segments, speakerLabels } = await getResolvedTranscript(meetingId, meeting.workspaceId)

    const drafts = chunkTranscriptSegments(
      segments.map((s) => ({
        id: s.id,
        startSeconds: s.startSeconds,
        endSeconds: s.endSeconds,
        text: s.text,
        speakerKey: s.speakerKey,
      })),
      { speakerLabels },
    )

    await db.transaction(async (tx) => {
      await tx.delete(meetingChunks).where(eq(meetingChunks.meetingId, meetingId))
      if (drafts.length > 0) {
        await tx.insert(meetingChunks).values(
          drafts.map((draft) => ({
            meetingId,
            workspaceId: meeting.workspaceId,
            chunkIndex: draft.index,
            content: draft.content,
            startSeconds: draft.startSeconds,
            endSeconds: draft.endSeconds,
            speakerKeys: draft.speakerKeys,
            segmentIds: draft.segmentIds,
            tokenCount: draft.tokenCount,
          })),
        )
      }
    })

    const stored = await db
      .select({ id: meetingChunks.id, content: meetingChunks.content })
      .from(meetingChunks)
      .where(and(eq(meetingChunks.meetingId, meetingId), eq(meetingChunks.workspaceId, meeting.workspaceId)))
      .orderBy(asc(meetingChunks.chunkIndex))

    if (stored.length > 0) {
      const { vectors, tokens } = await embedTexts(stored.map((c) => c.content))
      for (const [i, chunk] of stored.entries()) {
        const vector = vectors[i]
        if (!vector) continue
        await db.update(meetingChunks).set({ embedding: vector }).where(eq(meetingChunks.id, chunk.id))
      }
      await recordUsage(meeting.workspaceId, 'embedding_tokens', tokens)
    }

    await db
      .update(meetings)
      .set({ embeddingStatus: 'completed', embeddingError: null, status: 'ready', updatedAt: new Date() })
      .where(eq(meetings.id, meetingId))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    // §129 — searchable or not, the meeting itself is available.
    await db
      .update(meetings)
      .set({
        embeddingStatus: 'failed',
        embeddingError: message.slice(0, 1000),
        status: 'ready',
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, meetingId))
    throw err
  }
}

function extensionFromMime(mimeType: string): string {
  const base = mimeType.split(';')[0]?.trim() ?? ''
  switch (base) {
    case 'audio/webm':
    case 'video/webm':
      return 'webm'
    case 'audio/mpeg':
      return 'mp3'
    case 'audio/wav':
      return 'wav'
    case 'audio/ogg':
      return 'ogg'
    case 'audio/mp4':
    case 'video/mp4':
      return 'm4a'
    default:
      return 'bin'
  }
}

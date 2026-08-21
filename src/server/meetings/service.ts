import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  meetingAnalysis,
  meetingChunks,
  meetingSpeakers,
  meetingTranscriptSegments,
  meetings,
  type MeetingSource,
} from '@/server/db/schema'
import { getStorageProvider, meetingAudioPath } from '@/server/storage'
import { validateAudioFile } from '@/server/documents/validation'
import { enqueueAndRun } from '@/server/jobs'
import { recordAudit } from '@/server/audit'
import { recordUsage } from '@/server/usage'
import { trackEvent } from '@/server/analytics'
import { checkLimit, getPlanLimits } from '@/config/plans'
import { getServerEnv } from '@/config/env'
import { limitExceeded, notFound, validation } from '@/lib/errors'
import { formatDateEs } from '@/lib/time'
import { parseTranscriptText } from '@/server/transcription'
import type { WorkspaceAccess } from '@/server/permissions'
import { persistTranscription } from './transcript'

/**
 * §25/§86 — Meeting lifecycle.
 *
 * A meeting row exists from the moment recording starts, so an interrupted
 * session still has somewhere to attach whatever audio was captured (§177).
 * Audio upload, transcription, analysis and indexing each advance their own
 * status column, which is what lets the UI report honest per-stage progress.
 */

export async function createMeeting(input: {
  access: WorkspaceAccess
  title?: string | null
  projectId?: string | null
  meetingDate?: Date
  language?: string | null
  participants?: string[]
  source?: MeetingSource
  description?: string | null
}): Promise<string> {
  const db = await getDb()
  const meetingDate = input.meetingDate ?? new Date()
  // §58 — the title is optional; the date is a better default than "Untitled".
  const title = input.title?.trim() || `Reunión ${formatDateEs(meetingDate)}`

  const rows = await db
    .insert(meetings)
    .values({
      workspaceId: input.access.workspaceId,
      projectId: input.projectId ?? null,
      createdBy: input.access.userId,
      title: title.slice(0, 200),
      description: input.description?.trim() || null,
      source: input.source ?? 'recording',
      meetingDate,
      language: input.language && input.language !== 'auto' ? input.language : null,
      participantsHint: input.participants ?? [],
      status: 'draft',
    })
    .returning({ id: meetings.id })

  const meeting = rows[0]
  if (!meeting) throw new Error('No pudimos crear la reunión.')

  await recordAudit({
    action: 'meeting_created',
    workspaceId: input.access.workspaceId,
    actorId: input.access.userId,
    resourceType: 'meeting',
    resourceId: meeting.id,
    metadata: { source: input.source ?? 'recording' },
  })
  await trackEvent('meeting_created', input.access, { source: input.source ?? 'recording' })

  return meeting.id
}

export async function markRecordingStarted(meetingId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await db
    .update(meetings)
    .set({ status: 'recording', startedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, access.workspaceId)))
  await trackEvent('recording_started', access)
}

/**
 * §71/§72 — Attaches audio to a meeting and kicks off processing.
 *
 * Validation happens on the bytes, the storage key is derived from verified
 * ids, and the meeting only moves to `processing` once the object is durably
 * stored — so a failed upload leaves a meeting the user can retry, not a
 * meeting that claims to have audio it does not have.
 */
export async function attachAudio(input: {
  access: WorkspaceAccess
  meetingId: string
  buffer: Buffer
  filename: string
  declaredMime: string
  durationSeconds?: number | null
}): Promise<void> {
  const db = await getDb()
  const meeting = await getMeeting(input.meetingId, input.access.workspaceId)
  const file = validateAudioFile({
    buffer: input.buffer,
    filename: input.filename,
    declaredMime: input.declaredMime,
  })

  const limits = getPlanLimits(input.access.plan)
  const sizeCheck = checkLimit(limits, 'maxAudioUploadBytes', 0, file.size)
  if (!sizeCheck.allowed) throw limitExceeded(sizeCheck.reason)

  const durationSeconds = input.durationSeconds ?? meeting.durationSeconds ?? null
  if (durationSeconds !== null) {
    const maxSeconds =
      Math.min(limits.maxMeetingDurationMinutes, getServerEnv().MAX_MEETING_DURATION_MINUTES) * 60
    if (durationSeconds > maxSeconds) {
      throw limitExceeded(
        `La reunión supera la duración máxima permitida (${Math.round(maxSeconds / 60)} minutos).`,
      )
    }
  }

  // Replacing audio: remove the previous object so storage does not leak.
  if (meeting.audioStoragePath) {
    await getStorageProvider().delete(meeting.audioStoragePath).catch(() => undefined)
  }

  const path = meetingAudioPath(input.access.workspaceId, input.meetingId, file.extension)
  await getStorageProvider().upload({ path, body: input.buffer, mimeType: file.mimeType })

  await db
    .update(meetings)
    .set({
      audioStoragePath: path,
      audioMimeType: file.mimeType,
      audioSizeBytes: file.size,
      durationSeconds,
      endedAt: meeting.endedAt ?? new Date(),
      status: 'processing',
      transcriptionStatus: 'pending',
      transcriptionError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(meetings.id, input.meetingId), eq(meetings.workspaceId, input.access.workspaceId)))

  const minutes = durationSeconds ? durationSeconds / 60 : 0
  await recordUsage(input.access.workspaceId, 'meeting_recorded', 1, { userId: input.access.userId })
  if (minutes > 0) {
    await recordUsage(input.access.workspaceId, 'meeting_audio_minutes', minutes, {
      userId: input.access.userId,
    })
  }
  await trackEvent(
    meeting.source === 'upload' ? 'meeting_uploaded' : 'recording_completed',
    input.access,
    { durationSeconds: durationSeconds ?? 0, sizeBytes: file.size },
  )

  await enqueueAndRun({
    workspaceId: input.access.workspaceId,
    resourceType: 'meeting',
    resourceId: input.meetingId,
    type: 'meeting_transcription',
  })
}

/**
 * §57 — Transcript import. A real ingestion path: the user supplies the
 * transcript, KnowHub does the rest of the pipeline (speakers, timestamps,
 * analysis, indexing) with no transcription provider involved.
 */
export async function importTranscript(input: {
  access: WorkspaceAccess
  meetingId: string
  transcript: string
}): Promise<void> {
  const db = await getDb()
  await getMeeting(input.meetingId, input.access.workspaceId)

  const parsed = parseTranscriptText(input.transcript)
  if (parsed.segments.length === 0) {
    throw validation('No pudimos leer segmentos en esa transcripción.')
  }

  await db
    .update(meetings)
    .set({ status: 'processing', transcriptionStatus: 'processing', updatedAt: new Date() })
    .where(eq(meetings.id, input.meetingId))

  await persistTranscription({
    meetingId: input.meetingId,
    workspaceId: input.access.workspaceId,
    result: parsed,
  })

  await db
    .update(meetings)
    .set({
      transcriptionStatus: 'completed',
      durationSeconds: parsed.durationSeconds ?? null,
      source: 'transcript_import',
      updatedAt: new Date(),
    })
    .where(eq(meetings.id, input.meetingId))

  await enqueueAndRun({
    workspaceId: input.access.workspaceId,
    resourceType: 'meeting',
    resourceId: input.meetingId,
    type: 'meeting_analysis',
  })
}

export async function getMeeting(meetingId: string, workspaceId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, workspaceId), isNull(meetings.deletedAt)))
    .limit(1)
  const meeting = rows[0]
  if (!meeting) throw notFound('No encontramos esta reunión.')
  return meeting
}

export async function listMeetings(
  workspaceId: string,
  options: { projectId?: string | null; limit?: number } = {},
) {
  const db = await getDb()
  const conditions = [eq(meetings.workspaceId, workspaceId), isNull(meetings.deletedAt)]
  if (options.projectId) conditions.push(eq(meetings.projectId, options.projectId))

  return db
    .select({
      id: meetings.id,
      title: meetings.title,
      status: meetings.status,
      meetingDate: meetings.meetingDate,
      durationSeconds: meetings.durationSeconds,
      projectId: meetings.projectId,
      transcriptionStatus: meetings.transcriptionStatus,
      analysisStatus: meetings.analysisStatus,
      embeddingStatus: meetings.embeddingStatus,
      source: meetings.source,
      // Literal aliases, not interpolated columns: see the note in
      // server/projects/index.ts about unqualified names in `sql` templates.
      speakerCount: sql<number>`(
        select count(*) from meeting_speakers s where s.meeting_id = meetings.id
      )`,
    })
    .from(meetings)
    .where(and(...conditions))
    .orderBy(desc(meetings.meetingDate))
    .limit(options.limit ?? 50)
}

export async function getTranscript(meetingId: string, workspaceId: string) {
  const db = await getDb()
  return db
    .select()
    .from(meetingTranscriptSegments)
    .where(
      and(
        eq(meetingTranscriptSegments.meetingId, meetingId),
        eq(meetingTranscriptSegments.workspaceId, workspaceId),
      ),
    )
    .orderBy(asc(meetingTranscriptSegments.segmentIndex))
}

export async function getSpeakers(meetingId: string, workspaceId: string) {
  const db = await getDb()
  return db
    .select()
    .from(meetingSpeakers)
    .where(and(eq(meetingSpeakers.meetingId, meetingId), eq(meetingSpeakers.workspaceId, workspaceId)))
    .orderBy(asc(meetingSpeakers.speakerKey))
}

export async function getAnalysis(meetingId: string, workspaceId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(meetingAnalysis)
    .where(and(eq(meetingAnalysis.meetingId, meetingId), eq(meetingAnalysis.workspaceId, workspaceId)))
    .limit(1)
  return rows[0] ?? null
}

/**
 * §80 — Renaming a speaker updates the mapping only. The transcript rows keep
 * their original `speaker_key`, so the change is reversible and the source of
 * truth is untouched.
 */
export async function renameSpeaker(input: {
  access: WorkspaceAccess
  meetingId: string
  speakerKey: string
  displayName: string | null
}): Promise<void> {
  const db = await getDb()
  await getMeeting(input.meetingId, input.access.workspaceId)
  const name = input.displayName?.trim().slice(0, 80) || null

  await db
    .update(meetingSpeakers)
    .set({ displayName: name, updatedAt: new Date() })
    .where(
      and(
        eq(meetingSpeakers.meetingId, input.meetingId),
        eq(meetingSpeakers.speakerKey, input.speakerKey),
        eq(meetingSpeakers.workspaceId, input.access.workspaceId),
      ),
    )
}

/** §126 — Soft delete first; audio is only removed on an explicit purge. */
export async function softDeleteMeeting(meetingId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await getMeeting(meetingId, access.workspaceId)
  await db
    .update(meetings)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, access.workspaceId)))
  await recordAudit({
    action: 'meeting_deleted',
    workspaceId: access.workspaceId,
    actorId: access.userId,
    resourceType: 'meeting',
    resourceId: meetingId,
  })
}

/**
 * §126 — Permanent delete removes audio, transcript, chunks, embeddings and
 * analysis. Cascading foreign keys handle the rows; the storage object has to
 * be deleted explicitly.
 */
export async function purgeMeeting(meetingId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  const rows = await db
    .select({ audioStoragePath: meetings.audioStoragePath })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, access.workspaceId)))
    .limit(1)
  const meeting = rows[0]
  if (!meeting) throw notFound('No encontramos esta reunión.')

  if (meeting.audioStoragePath) {
    await getStorageProvider().delete(meeting.audioStoragePath).catch((err) => {
      console.error('[knowhub] audio delete failed', err)
    })
    await recordAudit({
      action: 'meeting_audio_deleted',
      workspaceId: access.workspaceId,
      actorId: access.userId,
      resourceType: 'meeting',
      resourceId: meetingId,
    })
  }

  await db.transaction(async (tx) => {
    await tx.delete(meetingChunks).where(eq(meetingChunks.meetingId, meetingId))
    await tx.delete(meetingTranscriptSegments).where(eq(meetingTranscriptSegments.meetingId, meetingId))
    await tx.delete(meetingAnalysis).where(eq(meetingAnalysis.meetingId, meetingId))
    await tx.delete(meetingSpeakers).where(eq(meetingSpeakers.meetingId, meetingId))
    await tx
      .delete(meetings)
      .where(and(eq(meetings.id, meetingId), eq(meetings.workspaceId, access.workspaceId)))
  })
}

/** §73 — Playback URL, issued only after the caller has been authorised. */
export async function getAudioUrl(
  meetingId: string,
  access: WorkspaceAccess,
  expiresInSeconds = 3600,
): Promise<string | null> {
  const meeting = await getMeeting(meetingId, access.workspaceId)
  if (!meeting.audioStoragePath) return null
  const signed = await getStorageProvider().getSignedUrl(meeting.audioStoragePath, expiresInSeconds)
  return signed.url
}

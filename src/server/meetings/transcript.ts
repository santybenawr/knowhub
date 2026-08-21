import { and, asc, eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { meetingSpeakers, meetingTranscriptSegments } from '@/server/db/schema'
import type { TranscriptionResult } from '@/server/transcription'

/**
 * §30/§130 — Transcript persistence.
 *
 * Idempotent: re-running a transcription replaces the segments and speakers for
 * that meeting inside one transaction, so a retry can never leave a duplicated
 * or half-written transcript. Existing speaker display names survive the
 * replacement — a user who renamed SPEAKER_00 to "Santiago" should not lose it
 * because the meeting was re-processed (§80).
 */
export async function persistTranscription(input: {
  meetingId: string
  workspaceId: string
  result: TranscriptionResult
}): Promise<{ segmentCount: number; speakerKeys: string[] }> {
  const db = await getDb()

  const previousNames = new Map(
    (
      await db
        .select({ speakerKey: meetingSpeakers.speakerKey, displayName: meetingSpeakers.displayName })
        .from(meetingSpeakers)
        .where(eq(meetingSpeakers.meetingId, input.meetingId))
    ).map((row) => [row.speakerKey, row.displayName]),
  )

  const speakerKeys = [
    ...new Set(input.result.segments.map((s) => s.speakerId).filter((s): s is string => Boolean(s))),
  ].sort()

  await db.transaction(async (tx) => {
    await tx
      .delete(meetingTranscriptSegments)
      .where(eq(meetingTranscriptSegments.meetingId, input.meetingId))
    await tx.delete(meetingSpeakers).where(eq(meetingSpeakers.meetingId, input.meetingId))

    if (speakerKeys.length > 0) {
      await tx.insert(meetingSpeakers).values(
        speakerKeys.map((speakerKey) => ({
          meetingId: input.meetingId,
          workspaceId: input.workspaceId,
          speakerKey,
          // A rename by the user outranks whatever the source called them.
          displayName: previousNames.get(speakerKey) ?? input.result.speakerNames?.[speakerKey] ?? null,
        })),
      )
    }

    if (input.result.segments.length > 0) {
      await tx.insert(meetingTranscriptSegments).values(
        input.result.segments.map((segment, index) => ({
          meetingId: input.meetingId,
          workspaceId: input.workspaceId,
          segmentIndex: index,
          speakerKey: segment.speakerId ?? null,
          startSeconds: segment.start,
          // The CHECK constraint requires end >= start; providers occasionally
          // emit equal or inverted bounds on very short utterances.
          endSeconds: Math.max(segment.start, segment.end),
          text: segment.text,
          confidence: segment.confidence ?? null,
        })),
      )
    }
  })

  return { segmentCount: input.result.segments.length, speakerKeys }
}

export type ResolvedSegment = {
  id: string
  index: number
  speakerKey: string | null
  speakerLabel: string
  startSeconds: number
  endSeconds: number
  text: string
  confidence: number | null
}

/** §80 — Display names are resolved at read time; the transcript is untouched. */
export async function getResolvedTranscript(
  meetingId: string,
  workspaceId: string,
): Promise<{ segments: ResolvedSegment[]; speakerLabels: Map<string, string> }> {
  const db = await getDb()

  const [segments, speakers] = await Promise.all([
    db
      .select()
      .from(meetingTranscriptSegments)
      .where(
        and(
          eq(meetingTranscriptSegments.meetingId, meetingId),
          eq(meetingTranscriptSegments.workspaceId, workspaceId),
        ),
      )
      .orderBy(asc(meetingTranscriptSegments.segmentIndex)),
    db
      .select()
      .from(meetingSpeakers)
      .where(and(eq(meetingSpeakers.meetingId, meetingId), eq(meetingSpeakers.workspaceId, workspaceId)))
      .orderBy(asc(meetingSpeakers.speakerKey)),
  ])

  const labels = new Map<string, string>()
  speakers.forEach((speaker, index) => {
    labels.set(speaker.speakerKey, speaker.displayName ?? defaultSpeakerLabel(speaker.speakerKey, index))
  })

  return {
    segments: segments.map((segment) => ({
      id: segment.id,
      index: segment.segmentIndex,
      speakerKey: segment.speakerKey,
      speakerLabel: segment.speakerKey
        ? (labels.get(segment.speakerKey) ?? segment.speakerKey)
        : 'Sin identificar',
      startSeconds: Number(segment.startSeconds),
      endSeconds: Number(segment.endSeconds),
      // A manual correction wins for display; the original stays in `text`.
      text: segment.editedText ?? segment.text,
      confidence: segment.confidence === null ? null : Number(segment.confidence),
    })),
    speakerLabels: labels,
  }
}

/**
 * §29 — Never invent a name. An unnamed speaker is shown as "Hablante 1", which
 * is a position, not an identity.
 */
export function defaultSpeakerLabel(speakerKey: string, index: number): string {
  const match = speakerKey.match(/(\d+)$/)
  const number = match?.[1] ? Number(match[1]) + 1 : index + 1
  return `Hablante ${number}`
}

/** Transcript rendered for the analysis prompt: "[segmentId] mm:ss Nombre: texto". */
export function formatTranscriptForAnalysis(
  segments: ResolvedSegment[],
  options: { maxChars?: number } = {},
): string {
  const maxChars = options.maxChars ?? 40_000
  const lines: string[] = []
  let total = 0

  for (const segment of segments) {
    const timestamp = secondsToClock(segment.startSeconds)
    const speaker = segment.speakerKey ? segment.speakerLabel : 'Hablante'
    const line = `[${segment.id}] ${timestamp} ${speaker}: ${segment.text}`
    if (total + line.length > maxChars) break
    lines.push(line)
    total += line.length + 1
  }

  return lines.join('\n')
}

function secondsToClock(seconds: number): string {
  const total = Math.floor(seconds)
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

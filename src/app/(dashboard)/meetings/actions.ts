'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { requirePageContext } from '@/server/auth/guard'
import { assertProjectInWorkspace, requireMeetingAccess } from '@/server/permissions'
import {
  createMeeting,
  importTranscript,
  markRecordingStarted,
  purgeMeeting,
  renameSpeaker,
  softDeleteMeeting,
} from '@/server/meetings'
import { analyzeMeeting, indexMeeting, transcribeMeeting } from '@/server/meetings/pipeline'
import { enqueueAndRun } from '@/server/jobs'
import { enforceRateLimit } from '@/server/rate-limit'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  projectId: z.string().uuid().optional().nullable(),
  meetingDate: z.string().optional(),
  language: z.enum(['auto', 'es', 'en']).default('auto'),
  participants: z.string().trim().max(500).optional(),
  source: z.enum(['recording', 'upload', 'transcript_import']).default('recording'),
})

/** §58 — Pre-recording form. Everything except the source is optional. */
export async function createMeetingAction(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ meetingId: string }>> {
  try {
    const { access } = await requirePageContext('meeting:record')
    await enforceRateLimit('meetingCreate', access.userId)

    const parsed = createSchema.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Datos inválidos.')

    const projectId = await assertProjectInWorkspace(parsed.data.projectId ?? null, access.workspaceId)
    const meetingDate = parsed.data.meetingDate ? new Date(parsed.data.meetingDate) : new Date()

    const meetingId = await createMeeting({
      access,
      title: parsed.data.title ?? null,
      projectId,
      meetingDate: Number.isNaN(meetingDate.getTime()) ? new Date() : meetingDate,
      language: parsed.data.language,
      participants: (parsed.data.participants ?? '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .slice(0, 20),
      source: parsed.data.source,
    })

    revalidatePath('/meetings')
    return ok({ meetingId })
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function markRecordingStartedAction(meetingId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, meetingId, 'meeting:record')
    await markRecordingStarted(meetingId, access)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

/** §59 — Consent acknowledgement is recorded once per user, before first record. */
export async function acceptRecordingConsentAction(): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const db = await getDb()
    await db
      .update(users)
      .set({ recordingConsentAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function importTranscriptAction(input: {
  meetingId: string
  transcript: string
}): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, input.meetingId, 'content:create')
    await importTranscript({ access, meetingId: input.meetingId, transcript: input.transcript })
    revalidatePath(`/meetings/${input.meetingId}`)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function renameSpeakerAction(input: {
  meetingId: string
  speakerKey: string
  displayName: string
}): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, input.meetingId, 'content:edit')
    await renameSpeaker({
      access,
      meetingId: input.meetingId,
      speakerKey: input.speakerKey,
      displayName: input.displayName,
    })
    revalidatePath(`/meetings/${input.meetingId}`)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

/**
 * §127/§128/§129 — Retry a single stage. Each is independent, so a failed
 * analysis can be retried without re-running (and re-paying for) transcription.
 */
export async function retryStageAction(input: {
  meetingId: string
  stage: 'transcription' | 'analysis' | 'embedding'
}): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, input.meetingId, 'content:edit')
    await enforceRateLimit('reanalyze', access.userId)

    const type =
      input.stage === 'transcription'
        ? 'meeting_transcription'
        : input.stage === 'analysis'
          ? 'meeting_analysis'
          : 'meeting_embedding'

    await enqueueAndRun({
      workspaceId: access.workspaceId,
      resourceType: 'meeting',
      resourceId: input.meetingId,
      type,
    })

    revalidatePath(`/meetings/${input.meetingId}`)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function deleteMeetingAction(
  meetingId: string,
  permanent = false,
): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, meetingId, 'content:delete')
    if (permanent) await purgeMeeting(meetingId, access)
    else await softDeleteMeeting(meetingId, access)
  } catch (err) {
    return fail(toUserMessage(err))
  }
  revalidatePath('/meetings')
  redirect('/meetings')
}

/** Runs the pipeline inline. Used by tests and by the manual "procesar" button. */
export async function runPipelineNowAction(meetingId: string): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const access = await requireMeetingAccess(user.id, meetingId, 'content:edit')
    void access
    await transcribeMeeting(meetingId).catch(() => undefined)
    await analyzeMeeting(meetingId).catch(() => undefined)
    await indexMeeting(meetingId).catch(() => undefined)
    revalidatePath(`/meetings/${meetingId}`)
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

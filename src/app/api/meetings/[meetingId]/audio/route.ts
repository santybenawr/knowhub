import { NextResponse, type NextRequest } from 'next/server'
import { requireApiContext } from '@/server/auth/guard'
import { requireMeetingAccess } from '@/server/permissions'
import { attachAudio } from '@/server/meetings'
import { enforceRateLimit } from '@/server/rate-limit'
import { errorResponse, unauthorizedResponse } from '@/server/http'
import { validation } from '@/lib/errors'
import { getServerEnv } from '@/config/env'

export const dynamic = 'force-dynamic'
// Audio uploads can be large and slow; they must not run on the edge runtime.
export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * §71 — Audio upload.
 *
 * A route handler rather than a Server Action: the payload is a multi-megabyte
 * file, and Server Actions are not the right shape for that (§173).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const context = await requireApiContext('meeting:record')
    if (!context) return unauthorizedResponse()

    const { meetingId } = await params
    // Re-resolve access through the meeting itself: the id came from the URL.
    const access = await requireMeetingAccess(context.user.id, meetingId, 'meeting:record')

    await enforceRateLimit('audioUpload', access.userId)

    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) throw validation('Falta el archivo de audio.')

    const maxBytes = getServerEnv().MAX_AUDIO_UPLOAD_MB * 1024 * 1024
    if (file.size > maxBytes) {
      throw validation(`El audio supera el máximo de ${getServerEnv().MAX_AUDIO_UPLOAD_MB} MB.`)
    }

    const durationRaw = form.get('durationSeconds')
    const durationSeconds =
      typeof durationRaw === 'string' && durationRaw.trim() !== '' ? Number(durationRaw) : null

    await attachAudio({
      access,
      meetingId,
      buffer: Buffer.from(await file.arrayBuffer()),
      filename: file.name || `${meetingId}.webm`,
      declaredMime: file.type || 'audio/webm',
      durationSeconds: Number.isFinite(durationSeconds) ? durationSeconds : null,
    })

    return NextResponse.json({ ok: true, meetingId })
  } catch (err) {
    return errorResponse(err)
  }
}

import { NextResponse } from 'next/server'
import { requireApiContext } from '@/server/auth/guard'
import { requireMeetingAccess } from '@/server/permissions'
import { getMeeting } from '@/server/meetings'
import { errorResponse, unauthorizedResponse } from '@/server/http'

export const dynamic = 'force-dynamic'

/**
 * §88/§189 — Processing status for the progress UI.
 *
 * Polled by the meeting page while the pipeline runs, so the user can navigate
 * away and come back rather than watching a blocked screen.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ meetingId: string }> },
) {
  try {
    const context = await requireApiContext()
    if (!context) return unauthorizedResponse()

    const { meetingId } = await params
    const access = await requireMeetingAccess(context.user.id, meetingId)
    const meeting = await getMeeting(meetingId, access.workspaceId)

    return NextResponse.json({
      status: meeting.status,
      transcriptionStatus: meeting.transcriptionStatus,
      analysisStatus: meeting.analysisStatus,
      embeddingStatus: meeting.embeddingStatus,
      transcriptionError: meeting.transcriptionError,
      analysisError: meeting.analysisError,
      durationSeconds: meeting.durationSeconds,
    })
  } catch (err) {
    return errorResponse(err)
  }
}

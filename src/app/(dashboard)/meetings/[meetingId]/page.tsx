import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mic } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { requireMeetingAccess } from '@/server/permissions'
import {
  getAnalysis,
  getAudioUrl,
  getMeeting,
  getResolvedTranscript,
  defaultSpeakerLabel,
} from '@/server/meetings'
import { findRelated } from '@/server/search'
import { isTranscriptionMocked } from '@/server/transcription'
import { meetingAnalysisSchema } from '@/validations/meeting-analysis'
import { formatDateEs, formatDurationHuman, parseTimeParam } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { MeetingWorkspace, type MeetingAnalysisView } from '@/features/meetings/meeting-workspace'
import { RelatedKnowledge } from '@/components/shared/related-knowledge'
import { MeetingActions } from '@/features/meetings/meeting-actions'
import { deleteMeetingAction, renameSpeakerAction, retryStageAction } from '../actions'

type Params = { params: Promise<{ meetingId: string }>; searchParams: Promise<{ t?: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { user } = await requirePageContext()
    const { meetingId } = await params
    const access = await requireMeetingAccess(user.id, meetingId)
    const meeting = await getMeeting(meetingId, access.workspaceId)
    return { title: meeting.title }
  } catch {
    return { title: 'Reunión' }
  }
}

/** §94/§95 — Meeting detail. */
export default async function MeetingPage({ params, searchParams }: Params) {
  const { user } = await requirePageContext()
  const { meetingId } = await params
  const { t } = await searchParams

  let access
  try {
    access = await requireMeetingAccess(user.id, meetingId)
  } catch {
    notFound()
  }

  const meeting = await getMeeting(meetingId, access.workspaceId)

  const [transcript, analysisRow, audioUrl, related] = await Promise.all([
    getResolvedTranscript(meetingId, access.workspaceId),
    getAnalysis(meetingId, access.workspaceId),
    getAudioUrl(meetingId, access),
    findRelated({ workspaceId: access.workspaceId, kind: 'meeting', resourceId: meetingId }),
  ])

  const analysis: MeetingAnalysisView | null = analysisRow
    ? (meetingAnalysisSchema.parse({
        summary: analysisRow.summary,
        topics: analysisRow.topics,
        participants: analysisRow.participants,
        decisions: analysisRow.decisions,
        actionItems: analysisRow.actionItems,
        keyPoints: analysisRow.keyPoints,
        openQuestions: analysisRow.openQuestions,
        importantDates: analysisRow.importantDates,
        suggestedQuestions: analysisRow.suggestedQuestions,
      }) as MeetingAnalysisView)
    : null

  const speakers = [...transcript.speakerLabels.entries()].map(([speakerKey, displayName], index) => ({
    speakerKey,
    displayName: displayName || defaultSpeakerLabel(speakerKey, index),
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Reuniones
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{meeting.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>{formatDateEs(meeting.meetingDate)}</span>
              {meeting.durationSeconds ? <span>{formatDurationHuman(meeting.durationSeconds)}</span> : null}
              {speakers.length > 0 ? <span>{speakers.length} hablantes</span> : null}
              {meeting.status !== 'ready' ? (
                <Badge tone={meeting.status === 'failed' ? 'record' : 'warning'}>
                  {meeting.status === 'failed' ? 'Con errores' : 'Procesando'}
                </Badge>
              ) : null}
            </div>
          </div>

          <MeetingActions meetingId={meetingId} onDelete={deleteMeetingAction} />
        </div>
      </div>

      {!meeting.audioStoragePath && transcript.segments.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong px-6 py-12 text-center">
          <Mic className="mx-auto size-6 text-ink-faint" aria-hidden />
          <p className="mt-3 text-ink">Esta reunión todavía no tiene audio ni transcripción.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Sube una grabación o importa una transcripción desde{' '}
            <Link href="/meetings/new" className="text-brand hover:underline">
              nueva reunión
            </Link>
            .
          </p>
        </div>
      ) : (
        <MeetingWorkspace
          meetingId={meetingId}
          audioUrl={audioUrl}
          durationSeconds={meeting.durationSeconds}
          startAt={parseTimeParam(t)}
          segments={transcript.segments.map((segment) => ({
            id: segment.id,
            speakerKey: segment.speakerKey,
            speakerLabel: segment.speakerLabel,
            startSeconds: segment.startSeconds,
            endSeconds: segment.endSeconds,
            text: segment.text,
          }))}
          speakers={speakers}
          analysis={analysis}
          statuses={{
            transcription: meeting.transcriptionStatus,
            analysis: meeting.analysisStatus,
            embedding: meeting.embeddingStatus,
            transcriptionError: meeting.transcriptionError,
            analysisError: meeting.analysisError,
          }}
          transcriptionIsMock={isTranscriptionMocked() && meeting.source !== 'transcript_import'}
          onRenameSpeaker={renameSpeakerAction}
          onRetryStage={retryStageAction}
        />
      )}

      <RelatedKnowledge items={related} />
    </div>
  )
}

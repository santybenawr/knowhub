import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { formatDateEs } from '@/lib/time'
import { NewMeetingFlow } from '@/features/meetings/new-meeting-flow'
import { ProviderNotice } from '@/components/shared/provider-notice'
import {
  acceptRecordingConsentAction,
  createMeetingAction,
  importTranscriptAction,
  markRecordingStartedAction,
} from '../actions'

export const metadata: Metadata = { title: 'Nueva reunión' }

export default async function NewMeetingPage() {
  const { user, access } = await requirePageContext('meeting:record')
  const projects = await listProjects(access.workspaceId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/meetings"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Reuniones
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink">Nueva reunión</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Graba, sube una grabación o importa una transcripción existente.
        </p>
      </div>

      <ProviderNotice />

      <NewMeetingFlow
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        hasConsent={Boolean(user.recordingConsentAt)}
        todayLabel={formatDateEs(new Date())}
        createMeeting={createMeetingAction}
        acceptConsent={acceptRecordingConsentAction}
        importTranscript={importTranscriptAction}
        markStarted={markRecordingStartedAction}
      />
    </div>
  )
}

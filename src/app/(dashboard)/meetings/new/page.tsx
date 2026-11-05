import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { formatMeetingDate, parseMeetingDate, todayMeetingDate } from '@/lib/meeting-date'
import { NewMeetingFlow } from '@/features/meetings/new-meeting-flow'
import { ProviderNotice } from '@/components/shared/provider-notice'
import { isPublicBeta } from '@/lib/release'
import {
  acceptRecordingConsentAction,
  createMeetingAction,
  importTranscriptAction,
  markRecordingStartedAction,
} from '../actions'

export const metadata: Metadata = { title: 'Nueva reunión' }

export default async function NewMeetingPage({ searchParams }: {
  searchParams: Promise<{ project?: string | string[] }>
}) {
  const { user, access } = await requirePageContext('meeting:record')
  const projects = await listProjects(access.workspaceId)
  const { project } = await searchParams
  const projectId = (Array.isArray(project) ? project[0] : project) || null
  if (projectId && !projects.some(item => item.id === projectId)) notFound()

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
          {isPublicBeta() ? 'Pega la transcripción de tu reunión para organizarla y consultarla.' : 'Graba, sube una grabación o importa una transcripción existente.'}
        </p>
      </div>

      <ProviderNotice />

      <NewMeetingFlow
        key={projectId ?? 'unassigned'}
        initialProjectId={projectId}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        hasConsent={Boolean(user.recordingConsentAt)}
        todayLabel={formatMeetingDate(parseMeetingDate(todayMeetingDate())!)}
        createMeeting={createMeetingAction}
        acceptConsent={acceptRecordingConsentAction}
        importTranscript={importTranscriptAction}
        markStarted={markRecordingStartedAction}
      />
    </div>
  )
}

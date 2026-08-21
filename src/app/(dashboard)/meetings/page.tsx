import type { Metadata } from 'next'
import Link from 'next/link'
import { Mic } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { listMeetings } from '@/server/meetings'
import { listProjects } from '@/server/projects'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ResourceCard } from '@/components/shared/resource-card'
import { MeetingFilters } from '@/features/meetings/meeting-filters'

export const metadata: Metadata = { title: 'Reuniones' }

/** §56/§191/§192 — Meeting list. */
export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>
}) {
  const { access } = await requirePageContext()
  const { project } = await searchParams

  const [meetings, projects] = await Promise.all([
    listMeetings(access.workspaceId, { projectId: project ?? null }),
    listProjects(access.workspaceId),
  ])

  const projectNames = new Map(projects.map((p) => [p.id, p.name]))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Reuniones</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Cada conversación, con sus decisiones y su audio original.
          </p>
        </div>
        <Button asChild>
          <Link href="/meetings/new">
            <Mic /> Grabar reunión
          </Link>
        </Button>
      </div>

      {projects.length > 0 ? (
        <MeetingFilters
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          selected={project ?? null}
        />
      ) : null}

      {meetings.length === 0 ? (
        <EmptyState
          icon={<Mic className="size-6" />}
          title="Tus conversaciones importantes pueden convertirse en conocimiento."
          description="Graba una reunión o sube una grabación para comenzar."
          action={
            <Button asChild>
              <Link href="/meetings/new">Grabar reunión</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {meetings.map((meeting) => (
            <ResourceCard
              key={meeting.id}
              kind="meeting"
              id={meeting.id}
              title={meeting.title}
              date={meeting.meetingDate}
              durationSeconds={meeting.durationSeconds}
              status={meeting.status}
              projectName={meeting.projectId ? (projectNames.get(meeting.projectId) ?? null) : null}
              speakerCount={Number(meeting.speakerCount)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

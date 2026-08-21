import type { Metadata } from 'next'
import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { EmptyState } from '@/components/ui/empty-state'
import { NewProjectDialog } from '@/features/projects/new-project-dialog'
import { createProjectAction } from './actions'

export const metadata: Metadata = { title: 'Proyectos' }

export default async function ProjectsPage() {
  const { access } = await requirePageContext()
  const projects = await listProjects(access.workspaceId)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Proyectos</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Agrupa documentos, notas y reuniones de un mismo tema.
          </p>
        </div>
        <NewProjectDialog onCreate={createProjectAction} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="size-6" />}
          title="Todavía no tienes proyectos."
          description="Un proyecto acota la búsqueda y las preguntas a un tema concreto."
          action={<NewProjectDialog onCreate={createProjectAction} />}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}`}
                className="flex h-full flex-col gap-2 rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-border-strong"
              >
                <span className="text-2xl" aria-hidden>
                  {project.icon}
                </span>
                <h2 className="font-medium text-ink">{project.name}</h2>
                {project.description ? (
                  <p className="line-clamp-2 text-sm text-ink-muted">{project.description}</p>
                ) : null}
                <p className="mt-auto pt-2 text-xs text-ink-faint">
                  {Number(project.documentCount)} documentos · {Number(project.noteCount)} notas ·{' '}
                  {Number(project.meetingCount)} reuniones
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

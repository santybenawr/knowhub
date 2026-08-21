import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, FolderKanban } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { getLibraryCounts, getRecentActivity } from '@/server/library'
import { listProjects } from '@/server/projects'
import { getUsageSummary } from '@/server/usage'
import { greetingEs } from '@/lib/time'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { QuickActions } from '@/components/shared/quick-actions'
import { ResourceCard } from '@/components/shared/resource-card'
import { UsagePanel } from '@/components/shared/usage-panel'
import { ProviderNotice } from '@/components/shared/provider-notice'

export const metadata: Metadata = { title: 'Inicio' }

/** §50 — Home. §45: "¿Qué quieres recordar hoy?" leads. */
export default async function DashboardPage() {
  const { user, access } = await requirePageContext()
  if (!user.onboardingCompletedAt) redirect('/onboarding')

  const [recent, projects, counts, usage] = await Promise.all([
    getRecentActivity(access.workspaceId, 6),
    listProjects(access.workspaceId),
    getLibraryCounts(access.workspaceId),
    getUsageSummary(access.workspaceId, access.plan),
  ])

  const firstName = user.name.split(' ')[0] ?? user.name
  const isEmpty = counts.documents + counts.notes + counts.meetings === 0

  return (
    <div className="space-y-9">
      <header>
        <p className="text-sm text-ink-muted">
          {greetingEs()}, {firstName}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">
          ¿Qué quieres recordar hoy?
        </h1>
      </header>

      <ProviderNotice />

      <QuickActions />

      {isEmpty ? (
        <EmptyState
          title="Tu biblioteca está esperando su primer recuerdo."
          description="Graba una reunión, sube un documento o escribe una nota. KnowHub se encarga de organizarlo y de traerlo de vuelta cuando lo necesites."
          action={
            <Button asChild>
              <Link href="/meetings/new">Grabar mi primera reunión</Link>
            </Button>
          }
        />
      ) : (
        <section aria-labelledby="recientes">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recientes" className="text-lg font-semibold text-ink">
              Recientes
            </h2>
            <Link
              href="/library"
              className="flex items-center gap-1 text-sm text-ink-muted transition-colors hover:text-ink"
            >
              Ver biblioteca <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((item) => (
              <ResourceCard
                key={`${item.kind}-${item.id}`}
                kind={item.kind}
                id={item.id}
                title={item.title}
                date={item.date}
                projectName={item.projectName}
                durationSeconds={item.durationSeconds}
                status={item.status}
                excerpt={item.excerpt}
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section aria-labelledby="proyectos">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="proyectos" className="text-lg font-semibold text-ink">
              Proyectos
            </h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/projects">Gestionar</Link>
            </Button>
          </div>

          {projects.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-strong p-6 text-center">
              <p className="text-sm text-ink-muted">
                Los proyectos agrupan documentos, notas y reuniones de un mismo tema.
              </p>
              <Button asChild variant="secondary" size="sm" className="mt-3">
                <Link href="/projects">Crear proyecto</Link>
              </Button>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {projects.slice(0, 6).map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-border-strong"
                  >
                    <span className="text-xl" aria-hidden>
                      {project.icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-ink">{project.name}</p>
                      <p className="text-xs text-ink-faint">
                        {Number(project.documentCount)} doc · {Number(project.noteCount)} notas ·{' '}
                        {Number(project.meetingCount)} reuniones
                      </p>
                    </div>
                    <FolderKanban className="size-4 shrink-0 text-ink-faint" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <UsagePanel usage={usage} />
      </div>
    </div>
  )
}

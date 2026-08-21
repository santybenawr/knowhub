import type { Metadata } from 'next'
import Link from 'next/link'
import { FileStack, Upload } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { listLibrary } from '@/server/library'
import { listProjects } from '@/server/projects'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ResourceCard } from '@/components/shared/resource-card'
import { LibraryFilters } from '@/features/library/library-filters'
import { UploadDialog } from '@/features/library/upload-dialog'
import type { ResourceKind } from '@/server/search/types'

export const metadata: Metadata = { title: 'Biblioteca' }

const VALID_KINDS: ResourceKind[] = ['document', 'note', 'meeting']

/** §51 — Everything captured, in one list. */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; project?: string; upload?: string }>
}) {
  const { access } = await requirePageContext()
  const params = await searchParams

  const kind = VALID_KINDS.includes(params.kind as ResourceKind) ? (params.kind as ResourceKind) : null
  const projectId = params.project ?? null

  const [items, projects] = await Promise.all([
    listLibrary(access.workspaceId, {
      ...(kind ? { kinds: [kind] } : {}),
      projectId,
    }),
    listProjects(access.workspaceId),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Biblioteca</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Documentos, notas y reuniones de {access.workspaceName}.
          </p>
        </div>
        <UploadDialog
          projects={projects.map((p) => ({ id: p.id, name: p.name }))}
          defaultOpen={params.upload === '1'}
          trigger={
            <Button>
              <Upload /> Subir documento
            </Button>
          }
        />
      </div>

      <LibraryFilters
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedKind={kind}
        selectedProject={projectId}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FileStack className="size-6" />}
          title="Aquí vivirá todo tu conocimiento."
          description="Sube un documento, escribe una nota o graba una reunión. Todo queda buscable y citable."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/meetings/new">Grabar reunión</Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/notes/new">Crear nota</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
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
      )}
    </div>
  )
}

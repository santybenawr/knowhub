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
import { isPublicBeta } from '@/lib/release'
import { parseLibraryFilters } from '@/features/library/filter-state'
import { ProcessingRefresh } from '@/features/library/processing-refresh'

export const metadata: Metadata = { title: 'Biblioteca' }

/** §51 — Everything captured, in one list. */
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string | string[]; project?: string | string[]; format?: string | string[]; upload?: string | string[] }>
}) {
  const { access } = await requirePageContext()
  const params = await searchParams

  const { kind, projectId, format } = parseLibraryFilters(params)
  const filtered = Boolean(kind || projectId || format)

  const [items, projects] = await Promise.all([
    listLibrary(access.workspaceId, {
      ...(kind ? { kinds: [kind] } : {}),
      projectId,
      format,
    }),
    listProjects(access.workspaceId),
  ])

  return (
    <div className="space-y-6">
      <ProcessingRefresh active={items.some(item => ['pending', 'processing', 'uploading'].includes(item.status))} />
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
          defaultProjectId={projectId && projects.some(project => project.id === projectId) ? projectId : undefined}
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
        selectedFormat={format}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<FileStack className="size-6" />}
          title={filtered ? 'No hay contenido con estos filtros.' : 'Aquí vivirá todo tu conocimiento.'}
          description={filtered ? 'Prueba otro tipo, formato o proyecto. Tus demás recursos siguen en la biblioteca.' : isPublicBeta() ? 'Sube un documento, escribe una nota o importa una transcripción.' : 'Sube un documento, escribe una nota o graba una reunión. Todo queda buscable y citable.'}
          action={
            filtered ? <Button asChild variant="secondary"><Link href="/library">Quitar filtros</Link></Button> :
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/meetings/new">{isPublicBeta() ? 'Importar reunión' : 'Grabar reunión'}</Link>
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
              mimeType={item.mimeType}
            />
          ))}
        </div>
      )}
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Mic, NotebookPen, Upload } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { getProject } from '@/server/projects'
import { listLibrary } from '@/server/library'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ResourceCard } from '@/components/shared/resource-card'
import { UploadDialog } from '@/features/library/upload-dialog'
import { AskPanel } from '@/features/ask/ask-panel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Params = { params: Promise<{ projectId: string }> }

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { access } = await requirePageContext()
    const { projectId } = await params
    const project = await getProject(projectId, access.workspaceId)
    return { title: project.name }
  } catch {
    return { title: 'Proyecto' }
  }
}

export default async function ProjectPage({ params }: Params) {
  const { access } = await requirePageContext()
  const { projectId } = await params

  let project
  try {
    project = await getProject(projectId, access.workspaceId)
  } catch {
    notFound()
  }

  const items = await listLibrary(access.workspaceId, { projectId })

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Proyectos
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl" aria-hidden>
              {project.icon}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink">{project.name}</h1>
              {project.description ? (
                <p className="mt-1 max-w-xl text-sm text-ink-muted">{project.description}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild size="sm">
              <Link href="/meetings/new">
                <Mic /> Grabar
              </Link>
            </Button>
            <UploadDialog
              projects={[{ id: project.id, name: project.name }]}
              defaultProjectId={project.id}
              trigger={
                <Button variant="secondary" size="sm">
                  <Upload /> Subir
                </Button>
              }
            />
            <Button asChild variant="secondary" size="sm">
              <Link href="/notes/new">
                <NotebookPen /> Nota
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="recursos">
        <TabsList>
          <TabsTrigger value="recursos">Recursos</TabsTrigger>
          <TabsTrigger value="preguntar">Preguntar</TabsTrigger>
        </TabsList>

        <TabsContent value="recursos">
          {items.length === 0 ? (
            <EmptyState
              title="Este proyecto todavía está vacío."
              description="Sube un documento, escribe una nota o graba una reunión y quedará asociada aquí."
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
                  durationSeconds={item.durationSeconds}
                  status={item.status}
                  excerpt={item.excerpt}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="preguntar">
          <AskPanel
            scope={{ type: 'project', projectId }}
            placeholder={`Pregunta algo sobre ${project.name}...`}
            emptyTitle={`Pregunta sobre ${project.name}`}
            emptyDescription="Buscamos solo dentro de los recursos de este proyecto."
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

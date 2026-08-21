import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, FileText } from 'lucide-react'
import { requirePageContext } from '@/server/auth/guard'
import { requireDocumentAccess } from '@/server/permissions'
import { getDocument, getDocumentChunks } from '@/server/documents'
import { findRelated } from '@/server/search'
import { getStorageProvider } from '@/server/storage'
import { formatBytes, formatDateEs } from '@/lib/time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StageList } from '@/components/ui/status'
import { RelatedKnowledge } from '@/components/shared/related-knowledge'
import { AskPanel } from '@/features/ask/ask-panel'
import { DocumentActions } from '@/features/documents/document-actions'
import { DocumentContent } from '@/features/documents/document-content'
import { deleteDocumentAction, reprocessDocumentAction } from '../actions'

type Params = {
  params: Promise<{ documentId: string }>
  searchParams: Promise<{ chunk?: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { user } = await requirePageContext()
    const { documentId } = await params
    const access = await requireDocumentAccess(user.id, documentId)
    const document = await getDocument(documentId, access.workspaceId)
    return { title: document.title }
  } catch {
    return { title: 'Documento' }
  }
}

/** §113 — Document citations land here, scrolled to the cited excerpt. */
export default async function DocumentPage({ params, searchParams }: Params) {
  const { user } = await requirePageContext()
  const { documentId } = await params
  const { chunk } = await searchParams

  let access
  try {
    access = await requireDocumentAccess(user.id, documentId)
  } catch {
    notFound()
  }

  const [document, chunks, related] = await Promise.all([
    getDocument(documentId, access.workspaceId),
    getDocumentChunks(documentId, access.workspaceId),
    findRelated({ workspaceId: access.workspaceId, kind: 'document', resourceId: documentId }),
  ])

  // §73 — signed, short-lived, and only issued after the access check above.
  const downloadUrl = document.storagePath
    ? (await getStorageProvider().getSignedUrl(document.storagePath, 900)).url
    : null

  const processing = document.processingStatus === 'pending' || document.processingStatus === 'processing'

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/library"
          className="inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" /> Biblioteca
        </Link>

        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink">{document.title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-muted">
              <span>{formatDateEs(document.createdAt)}</span>
              <span>{formatBytes(document.fileSize)}</span>
              {document.pageCount ? <span>{document.pageCount} páginas</span> : null}
              {document.processingStatus === 'failed' ? <Badge tone="record">Falló</Badge> : null}
              {processing ? <Badge tone="warning">Procesando…</Badge> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {downloadUrl ? (
              <Button asChild variant="secondary" size="sm">
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  Abrir original
                </a>
              </Button>
            ) : null}
            <DocumentActions
              documentId={documentId}
              onReprocess={reprocessDocumentAction}
              onDelete={deleteDocumentAction}
            />
          </div>
        </div>
      </div>

      {processing ? (
        <div className="surface-card p-5">
          <h2 className="mb-3 text-sm font-semibold text-ink">Procesando el documento</h2>
          <StageList
            stages={[
              { label: 'Archivo guardado', state: 'completed' },
              { label: 'Extrayendo texto', state: document.processingStatus },
              { label: 'Preparando búsqueda', state: document.embeddingStatus },
            ]}
          />
        </div>
      ) : null}

      {document.processingStatus === 'failed' ? (
        <div
          className="flex items-start gap-3 rounded-card border border-record/40 bg-record-soft p-4 text-sm text-ink"
          role="alert"
        >
          <FileText className="mt-0.5 size-4 shrink-0 text-record" aria-hidden />
          <div>
            <p className="font-semibold">No pudimos procesar este documento.</p>
            {document.processingError ? (
              <p className="mt-1 text-xs text-ink-muted">{document.processingError}</p>
            ) : null}
            <p className="mt-1 text-xs text-ink-muted">
              El archivo original sigue guardado y puedes descargarlo.
            </p>
          </div>
        </div>
      ) : null}

      <Tabs defaultValue={document.summary ? 'resumen' : 'contenido'}>
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="contenido">Contenido</TabsTrigger>
          <TabsTrigger value="preguntar">Preguntar</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen">
          {document.summary ? (
            <div className="space-y-5">
              <p className="leading-relaxed text-ink-muted">{document.summary}</p>
              {document.topics.length > 0 ? (
                <div>
                  <h2 className="mb-2 text-sm font-semibold text-ink">Temas</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {document.topics.map((topic) => (
                      <Badge key={topic} tone="brand">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Este documento todavía no tiene resumen.</p>
          )}
        </TabsContent>

        <TabsContent value="contenido">
          <DocumentContent
            chunks={chunks.map((c) => ({
              id: c.id,
              content: c.content,
              pageNumber: c.pageNumber,
            }))}
            highlightChunkId={chunk ?? null}
          />
        </TabsContent>

        <TabsContent value="preguntar">
          <AskPanel
            scope={{ type: 'document', documentId }}
            placeholder="Pregunta algo sobre este documento..."
            emptyTitle="Pregunta sobre este documento"
            emptyDescription="Respondemos solo con su contenido y te mostramos la página."
          />
        </TabsContent>
      </Tabs>

      <RelatedKnowledge items={related} />
    </div>
  )
}

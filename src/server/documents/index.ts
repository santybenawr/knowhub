import { and, asc, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { documentChunks, documents } from '@/server/db/schema'
import { getStorageProvider, documentPath } from '@/server/storage'
import { chunkPages } from '@/server/ai/chunking'
import { embedTexts } from '@/server/ai/embeddings'
import { getAIProvider } from '@/server/ai'
import { buildDocumentSummaryMessages } from '@/server/ai/prompts'
import { documentSummarySchema } from '@/validations/meeting-analysis'
import { enqueueAndRun } from '@/server/jobs'
import { recordAudit } from '@/server/audit'
import { recordUsage } from '@/server/usage'
import { trackEvent } from '@/server/analytics'
import { checkLimit, getPlanLimits } from '@/config/plans'
import { limitExceeded, notFound } from '@/lib/errors'
import { truncate } from '@/lib/text'
import { parseDocument } from './parsers'
import { validateDocumentFile } from './validation'
import type { WorkspaceAccess } from '@/server/permissions'

export * from './parsers'
export * from './validation'

/**
 * §54 — Document ingestion pipeline.
 *
 * Upload → store (private) → parse → normalise → chunk → embed → summarise →
 * ready. Parsing and embedding run as jobs so a slow PDF never holds the
 * request open, and each stage records its own status so the UI can show real
 * progress instead of a spinner (§88).
 */
export async function createDocumentFromUpload(input: {
  access: WorkspaceAccess
  buffer: Buffer
  filename: string
  declaredMime: string
  title?: string | null
  projectId?: string | null
  description?: string | null
}): Promise<{ documentId: string }> {
  const db = await getDb()
  const file = validateDocumentFile({
    buffer: input.buffer,
    filename: input.filename,
    declaredMime: input.declaredMime,
  })

  await assertDocumentQuota(input.access, file.size)

  const inserted = await db
    .insert(documents)
    .values({
      workspaceId: input.access.workspaceId,
      projectId: input.projectId ?? null,
      createdBy: input.access.userId,
      title: (input.title?.trim() || stripExtension(input.filename)).slice(0, 200),
      description: input.description?.trim() || null,
      sourceType: 'upload',
      mimeType: file.mimeType,
      originalFilename: truncate(input.filename, 200),
      fileSize: file.size,
      processingStatus: 'pending',
    })
    .returning({ id: documents.id })

  const document = inserted[0]
  if (!document) throw new Error('No pudimos crear el documento.')

  // Path is derived from verified ids; the user's filename never reaches it.
  const path = documentPath(input.access.workspaceId, document.id, file.extension)
  await getStorageProvider().upload({ path, body: input.buffer, mimeType: file.mimeType })
  await db.update(documents).set({ storagePath: path }).where(eq(documents.id, document.id))

  await recordUsage(input.access.workspaceId, 'document_upload', 1, { userId: input.access.userId })
  await recordUsage(input.access.workspaceId, 'storage_bytes', file.size, { userId: input.access.userId })
  await recordAudit({
    action: 'document_uploaded',
    workspaceId: input.access.workspaceId,
    actorId: input.access.userId,
    resourceType: 'document',
    resourceId: document.id,
    metadata: { size: file.size, mimeType: file.mimeType },
  })
  await trackEvent('document_uploaded', input.access, { mimeType: file.mimeType, sizeBytes: file.size })

  await enqueueAndRun({
    workspaceId: input.access.workspaceId,
    resourceType: 'document',
    resourceId: document.id,
    type: 'document_processing',
  })

  return { documentId: document.id }
}

async function assertDocumentQuota(access: WorkspaceAccess, incomingBytes: number): Promise<void> {
  const db = await getDb()
  const limits = getPlanLimits(access.plan)
  const rows = await db
    .select({ count: sql<number>`count(*)`, bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)` })
    .from(documents)
    .where(and(eq(documents.workspaceId, access.workspaceId), isNull(documents.deletedAt)))

  const current = rows[0]
  const countCheck = checkLimit(limits, 'maxDocuments', Number(current?.count ?? 0))
  if (!countCheck.allowed) throw limitExceeded(countCheck.reason)

  const storageCheck = checkLimit(limits, 'maxStorageBytes', Number(current?.bytes ?? 0), incomingBytes)
  if (!storageCheck.allowed) throw limitExceeded(storageCheck.reason)
}

/** §130 — Re-running replaces chunks atomically instead of duplicating them. */
export async function processDocument(documentId: string): Promise<void> {
  const db = await getDb()
  const rows = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1)
  const document = rows[0]
  if (!document) throw notFound('No encontramos este documento.')
  if (!document.storagePath) throw notFound('Este documento no tiene archivo asociado.')

  await db
    .update(documents)
    .set({ processingStatus: 'processing', processingError: null, updatedAt: new Date() })
    .where(eq(documents.id, documentId))

  try {
    const { body } = await getStorageProvider().read(document.storagePath)
    const parsed = await parseDocument({
      buffer: body,
      mimeType: document.mimeType,
      filename: document.originalFilename ?? document.title,
    })

    const chunks = chunkPages(parsed.pages)

    await db.transaction(async (tx) => {
      await tx.delete(documentChunks).where(eq(documentChunks.documentId, documentId))
      if (chunks.length > 0) {
        await tx.insert(documentChunks).values(
          chunks.map((chunk) => ({
            documentId,
            workspaceId: document.workspaceId,
            content: chunk.content,
            chunkIndex: chunk.index,
            pageNumber: chunk.pageNumber ?? null,
            tokenCount: chunk.tokenCount,
          })),
        )
      }
    })

    const summary = await summarizeDocument(document.title, parsed.text)

    await db
      .update(documents)
      .set({
        processingStatus: 'completed',
        processingError: null,
        pageCount: parsed.pageCount,
        summary: summary?.summary ?? null,
        topics: summary?.topics ?? [],
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))

    await enqueueAndRun({
      workspaceId: document.workspaceId,
      resourceType: 'document',
      resourceId: documentId,
      type: 'document_embedding',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    await db
      .update(documents)
      .set({ processingStatus: 'failed', processingError: message.slice(0, 1000), updatedAt: new Date() })
      .where(eq(documents.id, documentId))
    throw err
  }
}

/** Summaries are a nice-to-have: a model failure must not fail ingestion. */
async function summarizeDocument(title: string, text: string) {
  if (text.trim().length < 200) return null
  try {
    const { data } = await getAIProvider().generateStructuredOutput({
      messages: buildDocumentSummaryMessages({ title, text: truncate(text, 12_000) }),
      schema: documentSummarySchema,
      schemaName: 'DocumentSummary',
    })
    return data
  } catch (err) {
    console.error('[knowhub] document summary failed', err)
    return null
  }
}

export async function embedDocument(documentId: string): Promise<void> {
  const db = await getDb()
  const docRows = await db
    .select({ workspaceId: documents.workspaceId })
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
  const document = docRows[0]
  if (!document) throw notFound('No encontramos este documento.')

  await db.update(documents).set({ embeddingStatus: 'processing' }).where(eq(documents.id, documentId))

  try {
    const chunks = await db
      .select({ id: documentChunks.id, content: documentChunks.content })
      .from(documentChunks)
      .where(eq(documentChunks.documentId, documentId))
      .orderBy(asc(documentChunks.chunkIndex))

    if (chunks.length > 0) {
      const { vectors, tokens } = await embedTexts(chunks.map((c) => c.content))
      for (const [i, chunk] of chunks.entries()) {
        const vector = vectors[i]
        if (!vector) continue
        await db.update(documentChunks).set({ embedding: vector }).where(eq(documentChunks.id, chunk.id))
      }
      await recordUsage(document.workspaceId, 'embedding_tokens', tokens)
    }

    await db.update(documents).set({ embeddingStatus: 'completed' }).where(eq(documents.id, documentId))
  } catch (err) {
    // §129 — the document stays readable and keyword-searchable even if
    // embeddings never land.
    await db.update(documents).set({ embeddingStatus: 'failed' }).where(eq(documents.id, documentId))
    throw err
  }
}

export async function getDocument(documentId: string, workspaceId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.workspaceId, workspaceId), isNull(documents.deletedAt)))
    .limit(1)
  const document = rows[0]
  if (!document) throw notFound('No encontramos este documento.')
  return document
}

export async function getDocumentChunks(documentId: string, workspaceId: string) {
  const db = await getDb()
  return db
    .select()
    .from(documentChunks)
    .where(and(eq(documentChunks.documentId, documentId), eq(documentChunks.workspaceId, workspaceId)))
    .orderBy(asc(documentChunks.chunkIndex))
}

export async function softDeleteDocument(documentId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await db
    .update(documents)
    .set({ deletedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.workspaceId, access.workspaceId)))
  await recordAudit({
    action: 'document_deleted',
    workspaceId: access.workspaceId,
    actorId: access.userId,
    resourceType: 'document',
    resourceId: documentId,
  })
}

function stripExtension(filename: string): string {
  return filename.replace(/\.[A-Za-z0-9]{1,8}$/, '') || filename
}

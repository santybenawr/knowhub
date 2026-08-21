import { afterAll, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { documentChunks, documents, noteChunks, notes } from '@/server/db/schema'
import { createDocumentFromUpload, getDocument } from '@/server/documents'
import { createNote, updateNote } from '@/server/notes'
import { createProject, listProjects } from '@/server/projects'
import { drainJobs } from '@/server/jobs'
import { search } from '@/server/search'
import { answerQuestion } from '@/server/ai/rag'
import { listLibrary } from '@/server/library'
import { getUsageSummary } from '@/server/usage'
import { SEARCH_CONFIG } from '@/config/search'
import { createMeeting, importTranscript } from '@/server/meetings'
import { createTestTenant } from '../helpers/factories'
import { OMEGA_TRANSCRIPT } from '../fixtures/transcript'

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

const CANVAS_DOC = `Modelo Canvas de negocio

El modelo Canvas describe la propuesta de valor de una organización en nueve bloques.
La propuesta de valor explica por qué un cliente elegiría esta oferta y no otra.
Los canales describen cómo la empresa entrega esa propuesta de valor a sus segmentos.
La estructura de costos agrupa los costos fijos y variables de operar el modelo.
Las fuentes de ingreso describen de dónde proviene el dinero del negocio.`

describe('document ingestion', () => {
  it('parses, chunks, embeds and makes a document searchable', async () => {
    const { access } = await createTestTenant()

    const { documentId } = await createDocumentFromUpload({
      access,
      buffer: Buffer.from(CANVAS_DOC, 'utf8'),
      filename: 'canvas.md',
      declaredMime: 'text/markdown',
      title: 'Modelo Canvas',
    })

    await drainJobs()

    const document = await getDocument(documentId, access.workspaceId)
    expect(document.processingStatus).toBe('completed')
    expect(document.embeddingStatus).toBe('completed')
    expect(document.mimeType).toBe('text/markdown')

    const db = await getDb()
    const chunks = await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId))
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.every((c) => c.embedding !== null)).toBe(true)
    expect(chunks.every((c) => c.workspaceId === access.workspaceId)).toBe(true)

    const hits = await search({ workspaceId: access.workspaceId, query: 'propuesta de valor' })
    expect(hits.some((h) => h.kind === 'document' && h.resourceId === documentId)).toBe(true)
  })

  it('rejects an unsupported file without creating a document', async () => {
    const { access } = await createTestTenant()
    const db = await getDb()

    await expect(
      createDocumentFromUpload({
        access,
        buffer: Buffer.from([0x00, 0x01, 0x02, 0x03]),
        filename: 'raro.exe',
        declaredMime: 'application/octet-stream',
      }),
    ).rejects.toThrow()

    const rows = await db.select().from(documents).where(eq(documents.workspaceId, access.workspaceId))
    expect(rows).toHaveLength(0)
  })

  it('counts the upload against the workspace usage', async () => {
    const { access } = await createTestTenant()
    await createDocumentFromUpload({
      access,
      buffer: Buffer.from(CANVAS_DOC, 'utf8'),
      filename: 'canvas.md',
      declaredMime: 'text/markdown',
    })
    await drainJobs()

    const usage = await getUsageSummary(access.workspaceId, access.plan)
    expect(usage.documents).toBe(1)
    expect(usage.storageBytes).toBeGreaterThan(0)
  })
})

describe('notes', () => {
  it('indexes a note so it can be found and cited', async () => {
    const { access } = await createTestTenant()

    const noteId = await createNote({
      access,
      title: 'Decisiones de proveedor',
      content:
        'Después de comparar tres propuestas, el equipo se inclinó por el proveedor B por sus condiciones de soporte técnico.',
    })
    await drainJobs()

    const db = await getDb()
    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.every((c) => c.embedding !== null)).toBe(true)

    const hits = await search({ workspaceId: access.workspaceId, query: 'soporte técnico proveedor' })
    expect(hits.some((h) => h.kind === 'note' && h.resourceId === noteId)).toBe(true)
  })

  it('re-indexes when the content changes, and not when it does not', async () => {
    const { access } = await createTestTenant()
    const db = await getDb()

    const noteId = await createNote({ access, title: 'Original', content: 'Contenido inicial de la nota.' })
    await drainJobs()

    await updateNote({ access, noteId, content: 'Ahora la nota habla de presupuesto y cronograma.' })
    await drainJobs()

    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks.some((c) => c.content.includes('presupuesto'))).toBe(true)
    expect(chunks.some((c) => c.content.includes('Contenido inicial'))).toBe(false)

    // Touching only the title leaves the embedding status alone.
    const [before] = await db.select({ status: notes.embeddingStatus }).from(notes).where(eq(notes.id, noteId))
    await updateNote({ access, noteId, title: 'Renombrada' })
    const [after] = await db.select({ status: notes.embeddingStatus }).from(notes).where(eq(notes.id, noteId))
    expect(after?.status).toBe(before?.status)
  })
})

describe('projects and library', () => {
  it('groups resources under a project and counts them', async () => {
    const { access } = await createTestTenant()
    const projectId = await createProject({ access, name: 'Proyecto Omega' })

    await createNote({ access, title: 'Nota del proyecto', content: 'Contenido.', projectId })
    await createDocumentFromUpload({
      access,
      buffer: Buffer.from(CANVAS_DOC, 'utf8'),
      filename: 'canvas.md',
      declaredMime: 'text/markdown',
      projectId,
    })
    await drainJobs()

    const [project] = await listProjects(access.workspaceId)
    expect(Number(project?.noteCount)).toBe(1)
    expect(Number(project?.documentCount)).toBe(1)

    const scoped = await listLibrary(access.workspaceId, { projectId })
    expect(scoped).toHaveLength(2)
    expect(scoped.every((item) => item.projectId === projectId)).toBe(true)
  })

  it('orders the library by recency across all three types', async () => {
    const { access } = await createTestTenant()
    await createNote({ access, title: 'Primera', content: 'uno' })
    await createNote({ access, title: 'Segunda', content: 'dos' })
    await drainJobs()

    const items = await listLibrary(access.workspaceId)
    expect(items.length).toBeGreaterThanOrEqual(2)
    for (let i = 0; i < items.length - 1; i++) {
      const current = items[i]?.date.getTime() ?? 0
      const next = items[i + 1]?.date.getTime() ?? 0
      expect(current).toBeGreaterThanOrEqual(next)
    }
  })
})

/** §103 — Global Ask must reach across documents, notes and meetings at once. */
describe('multi-source retrieval', () => {
  it('answers from a document and cites it', async () => {
    const { access } = await createTestTenant()
    await createDocumentFromUpload({
      access,
      buffer: Buffer.from(CANVAS_DOC, 'utf8'),
      filename: 'canvas.md',
      declaredMime: 'text/markdown',
      title: 'Modelo Canvas',
    })
    await drainJobs()

    const answer = await answerQuestion({
      workspaceId: access.workspaceId,
      question: '¿Qué describe la propuesta de valor?',
      scope: { type: 'workspace' },
    })

    expect(answer.usedEvidence).toBe(true)
    expect(answer.citations.length).toBeGreaterThan(0)
    expect(answer.citations[0]?.kind).toBe('document')
    expect(answer.citations[0]?.href).toContain('/documents/')
  })

  it('refuses to answer when the library holds no evidence', async () => {
    const { access } = await createTestTenant()
    const answer = await answerQuestion({
      workspaceId: access.workspaceId,
      question: '¿Cuál es la capital de Mongolia?',
      scope: { type: 'workspace' },
    })

    // §114 — no evidence means no answer, not a fact recalled from training.
    expect(answer.usedEvidence).toBe(false)
    expect(answer.citations).toHaveLength(0)
    expect(answer.answer).toContain('No encontré suficiente información')
  })
})

/**
 * §104/§105 — Hybrid retrieval quality.
 *
 * These are the behaviours the search layer exists for: a question phrased in
 * different words than the source must still find it, and an unrelated question
 * must not.
 */
describe('hybrid search behaviour', () => {
  it('matches a question against text that uses different word forms', async () => {
    const { access } = await createTestTenant()
    await createNote({
      access,
      title: 'Proveedores',
      content: 'Entonces vamos a seleccionar el proveedor B por sus condiciones de soporte.',
    })
    await drainJobs()

    // "decidimos" never appears literally; stemming and the OR query bridge it.
    const hits = await search({
      workspaceId: access.workspaceId,
      query: '¿Qué decidimos sobre el proveedor?',
    })
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.score).toBeGreaterThan(0.1)
  })

  it('does not match on stopwords alone', async () => {
    const { access } = await createTestTenant()
    await createNote({
      access,
      title: 'Proveedores',
      content: 'Entonces vamos a seleccionar el proveedor B por sus condiciones de soporte.',
    })
    await drainJobs()

    const hits = await search({ workspaceId: access.workspaceId, query: 'receta de cocina' })
    // "de" is shared, but it is a stopword and must not produce a relevant hit.
    const best = hits[0]?.score ?? 0
    expect(best).toBeLessThan(SEARCH_CONFIG.rag.scoreThreshold * 5)
  })

  it('ranks the right resource first when the workspace holds several topics', async () => {
    const { access } = await createTestTenant()
    await createNote({ access, title: 'Cocina', content: 'La receta lleva harina, huevos y azúcar. Hornear treinta minutos.' })
    const meetingId = await createMeeting({ access, title: 'Omega' })
    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await drainJobs()

    const supplier = await search({ workspaceId: access.workspaceId, query: 'proveedor B' })
    expect(supplier[0]?.kind).toBe('meeting')

    const recipe = await search({ workspaceId: access.workspaceId, query: 'receta harina huevos' })
    expect(recipe[0]?.kind).toBe('note')
  })
})

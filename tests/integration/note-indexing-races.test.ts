import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/server/db/client'
import { noteChunks, notes } from '@/server/db/schema'
import { createNote, getNote, indexNote, softDeleteNote, updateNote } from '@/server/notes'
import { getAIProvider, setAIProvider } from '@/server/ai'
import { search } from '@/server/search'
import { getJobsForResource, registerJobHandlers, waitForInflightJobs } from '@/server/jobs'
import { createTestTenant } from '../helpers/factories'

afterEach(async () => {
  await waitForInflightJobs()
  vi.restoreAllMocks()
  setAIProvider(null)
  registerJobHandlers({ note_embedding: ({ resourceId }) => indexNote(resourceId) })
})
afterAll(closeDb)

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>(done => { resolve = done })
  return { promise, resolve }
}

async function delayedIndexing() {
  const { access } = await createTestTenant()
  const noteId = await createNote({ access, title: 'Título previo', content: 'Primera versión conservada' })
  await waitForInflightJobs()
  const provider = getAIProvider()
  const embed = provider.createEmbedding.bind(provider)
  const entered = deferred()
  const release = deferred()
  const spy = vi.spyOn(provider, 'createEmbedding').mockImplementationOnce(async texts => {
    entered.resolve()
    await release.promise
    return embed(texts)
  })
  await updateNote({ access, noteId, content: 'Versión intermedia mientras trabaja' })
  await entered.promise
  return { access, noteId, release, spy, db: await getDb() }
}

describe('note edits during indexing', () => {
  it('indexes a newly created title-only note so it can be found without editing it again', async () => {
    const { access } = await createTestTenant()
    const noteId = await createNote({ access, title: 'Presupuesto trimestral de investigación' })
    await waitForInflightJobs()
    expect((await getNote(noteId, access.workspaceId)).embeddingStatus).toBe('completed')
    const hits = await search({ workspaceId: access.workspaceId, query: 'Presupuesto trimestral' })
    expect(hits.some(hit => hit.kind === 'note' && hit.resourceId === noteId)).toBe(true)
  })

  it.each([
    {},
    { title: '   ', content: ' \n\t ' },
  ])('does not leave an empty new note waiting for nonexistent work: %j', async input => {
    const { access } = await createTestTenant()
    const embedding = vi.spyOn(getAIProvider(), 'createEmbedding')
    const noteId = await createNote({ access, ...input })
    expect((await getNote(noteId, access.workspaceId)).embeddingStatus).toBe('completed')
    expect(await getJobsForResource(noteId)).toHaveLength(0)
    expect(embedding).not.toHaveBeenCalled()
    const db = await getDb()
    expect(await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))).toHaveLength(0)
    await updateNote({ access, noteId, title: 'Primera idea de investigación' })
    await waitForInflightJobs()
    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(chunks.map(chunk => chunk.content).join('\n')).toBe('Primera idea de investigación')
  })

  it.each([
    { label: 'new content', change: { content: 'Última versión definitiva' }, expected: 'Última versión definitiva' },
    { label: 'title only', change: { title: 'Título definitivo' }, expected: 'Título definitivo' },
    { label: 'empty note', change: { title: '', content: '' }, expected: '' },
  ])('automatically indexes $label after an in-flight snapshot without a worker drain', async ({ change, expected }) => {
    const { access, noteId, release, db } = await delayedIndexing()
    try {
      const before = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
      expect(before.map(chunk => chunk.content).join('\n')).toContain('Primera versión conservada')
      await updateNote({ access, noteId, ...change })
      const jobs = await getJobsForResource(noteId)
      expect(jobs.filter(job => job.status === 'processing')).toHaveLength(1)
      expect(jobs.filter(job => job.status === 'pending')).toHaveLength(1)
    } finally {
      release.resolve()
    }
    await waitForInflightJobs()
    const saved = await getNote(noteId, access.workspaceId)
    expect(saved.embeddingStatus).toBe('completed')
    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    if (expected) expect(chunks.map(chunk => chunk.content).join('\n')).toContain(expected)
    else expect(chunks).toHaveLength(0)
    expect((await getJobsForResource(noteId)).every(job => job.status === 'completed')).toBe(true)
  })

  it('coalesces multiple intervening edits into one follow-up job', async () => {
    const { access, noteId, release, db, spy } = await delayedIndexing()
    try {
      await updateNote({ access, noteId, content: 'Edición dos' })
      await updateNote({ access, noteId, content: 'Edición tres' })
      await updateNote({ access, noteId, content: 'Edición cuatro final' })
      const jobs = await getJobsForResource(noteId)
      expect(jobs.filter(job => job.status === 'processing')).toHaveLength(1)
      expect(jobs.filter(job => job.status === 'pending')).toHaveLength(1)
    } finally {
      release.resolve()
    }
    await waitForInflightJobs()
    expect(spy).toHaveBeenCalledTimes(2)
    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(chunks.map(chunk => chunk.content).join('\n')).toContain('Edición cuatro final')
  })

  it('does not publish a delayed snapshot after its note is deleted', async () => {
    const { access, noteId, release, db } = await delayedIndexing()
    const before = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    try {
      await softDeleteNote(noteId, access)
    } finally {
      release.resolve()
    }
    await waitForInflightJobs()
    const after = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(after.map(chunk => chunk.id)).toEqual(before.map(chunk => chunk.id))
    const [deleted] = await db.select().from(notes).where(eq(notes.id, noteId))
    expect(deleted?.deletedAt).toBeInstanceOf(Date)
  })

  it('does not lose an edit after chunks are committed but before the running job closes', async () => {
    const { access } = await createTestTenant()
    const noteId = await createNote({ access, content: 'Contenido inicial' })
    await waitForInflightJobs()
    const committed = deferred()
    const release = deferred()
    let first = true
    registerJobHandlers({ note_embedding: async ({ resourceId }) => {
      await indexNote(resourceId)
      if (first) {
        first = false
        committed.resolve()
        await release.promise
      }
    } })
    await updateNote({ access, noteId, content: 'Cambio antes de cerrar el trabajo' })
    await committed.promise
    try {
      await updateNote({ access, noteId, content: 'Cambio justo al terminar' })
    } finally {
      release.resolve()
    }
    await waitForInflightJobs()
    const db = await getDb()
    const chunks = await db.select().from(noteChunks).where(eq(noteChunks.noteId, noteId))
    expect(chunks.map(chunk => chunk.content).join('\n')).toBe('Cambio justo al terminar')
    expect((await getNote(noteId, access.workspaceId)).embeddingStatus).toBe('completed')
  })
})

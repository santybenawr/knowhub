import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { documentChunks, documents } from '@/server/db/schema'
import { createDocumentFromUpload, getDocument } from '@/server/documents'
import { createNote } from '@/server/notes'
import { createMeeting } from '@/server/meetings'
import { createProject, deleteProject, updateProject } from '@/server/projects'
import { listLibrary } from '@/server/library'
import { drainJobs } from '@/server/jobs'
import type { ResourceKind } from '@/server/search/types'
import { createTestTenant } from '../helpers/factories'
import { getStorageProvider } from '@/server/storage'

afterEach(() => vi.restoreAllMocks())

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

describe('library type and project filters', () => {
  it('returns the correct resource types for every combination, with project isolation', async () => {
    const { access } = await createTestTenant()
    const projectId = await createProject({ access, name: 'Archivos del proyecto' })
    await createNote({ access, title: 'Apuntes', content: 'Texto de la nota.', projectId })
    await createMeeting({ access, title: 'Reunión', projectId })
    await createDocumentFromUpload({ access, projectId, buffer: Buffer.from('Documento de lectura.'), filename: 'lectura.txt', declaredMime: 'text/plain' })
    await createNote({ access, title: 'Fuera del proyecto', content: 'Otro texto.' })
    const other = await createTestTenant()
    await createNote({ access: other.access, title: 'Privada', content: 'Otra cuenta.' })
    await drainJobs()

    const kinds: ResourceKind[] = ['document', 'note', 'meeting']
    for (let mask = 1; mask < 8; mask++) {
      const selected = kinds.filter((_, index) => mask & (1 << index))
      for (const project of [undefined, projectId]) {
        const items = await listLibrary(access.workspaceId, { kinds: selected, ...(project ? { projectId: project } : {}) })
        expect(items.map(item => item.kind).sort()).toEqual(
          [...selected, ...(!project && selected.includes('note') ? ['note'] : [])].sort(),
        )
        expect(items.every(item => item.date instanceof Date && !Number.isNaN(item.date.getTime()))).toBe(true)
        expect(items.some(item => item.title === 'Privada')).toBe(false)
        if (project) expect(items.every(item => item.projectName === 'Archivos del proyecto')).toBe(true)
      }
    }
  })

  it('filters document formats without mixing notes, meetings or another workspace', async () => {
    const { access } = await createTestTenant()
    const projectId = await createProject({ access, name: 'Formatos' })
    const other = await createTestTenant()
    for (const [index, mimeType] of ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown'].entries()) {
      const db = await getDb()
      await db.insert(documents).values({ workspaceId: access.workspaceId, createdBy: access.userId, title: `Formato ${index}`, mimeType, projectId })
      await db.insert(documents).values({ workspaceId: other.access.workspaceId, createdBy: other.access.userId, title: 'Otro usuario', mimeType })
    }
    await createNote({ access, title: 'Una nota', projectId })
    for (const format of ['pdf', 'docx', 'txt', 'md'] as const) {
      const items = await listLibrary(access.workspaceId, { format, projectId })
      expect(items).toHaveLength(1)
      expect(items[0]?.kind).toBe('document')
      expect(items[0]?.mimeType).toBeTruthy()
      expect(items[0]?.title).not.toBe('Otro usuario')
    }
    expect(await listLibrary(access.workspaceId, { kinds: ['note'], format: 'pdf' })).toEqual([])
  })

  it('keeps resources accessible without a stale project label after deleting the project', async () => {
    const { access } = await createTestTenant()
    const projectId = await createProject({ access, name: 'Temporal' })
    await createNote({ access, title: 'Conservar nota', projectId })
    await createMeeting({ access, title: 'Conservar reunión', projectId })
    await createDocumentFromUpload({ access, projectId, buffer: Buffer.from('Conservar este texto.'), filename: 'lectura.txt', declaredMime: 'text/plain' })
    await drainJobs()
    await deleteProject(projectId, access)
    const items = await listLibrary(access.workspaceId)
    expect(items).toHaveLength(3)
    expect(items.every(item => item.projectId === null && item.projectName === null)).toBe(true)
  })

  it('rejects an empty project name when renaming', async () => {
    const { access } = await createTestTenant()
    const projectId = await createProject({ access, name: 'Proyecto' })
    await expect(updateProject({ access, projectId, name: '  ' })).rejects.toThrow('Ingresa un nombre')
  })
})

describe('document upload recovery', () => {
  it('does not leave an unusable pending document after storage fails', async () => {
    const { access } = await createTestTenant()
    vi.spyOn(getStorageProvider(), 'upload').mockRejectedValueOnce(new Error('Storage unavailable'))
    await expect(createDocumentFromUpload({ access, buffer: Buffer.from('Documento.'), filename: 'lectura.txt', declaredMime: 'text/plain' })).rejects.toThrow('Storage unavailable')
    expect(await listLibrary(access.workspaceId)).toHaveLength(0)
  })
})

describe('plain text encodings from common editors', () => {
  const content = 'La organización definió el próximo envío para el miércoles. El presupuesto está aprobado.'
  const utf16 = Buffer.from(content, 'utf16le')
  const fixtures = [
    { label: 'UTF-8 con BOM', buffer: Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(content)]) },
    { label: 'UTF-16 LE', buffer: Buffer.concat([Buffer.from([0xff, 0xfe]), utf16]) },
    { label: 'UTF-16 BE', buffer: Buffer.concat([Buffer.from([0xfe, 0xff]), Buffer.from(utf16).swap16()]) },
    { label: 'Windows-1252', buffer: Buffer.from(content, 'latin1') },
  ]

  for (const fixture of fixtures) {
    it(`preserves accents and indexes a ${fixture.label} TXT`, async () => {
      const { access } = await createTestTenant()
      const { documentId } = await createDocumentFromUpload({ access, buffer: fixture.buffer, filename: 'acta.TXT', declaredMime: 'application/octet-stream' })
      await drainJobs()
      const document = await getDocument(documentId, access.workspaceId)
      expect(document.processingStatus).toBe('completed')
      expect(document.embeddingStatus).toBe('completed')
      const db = await getDb()
      const chunks = await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId))
      expect(chunks.map(chunk => chunk.content).join('\n')).toContain(content)
    })
  }
})

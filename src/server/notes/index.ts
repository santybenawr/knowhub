import { and, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { noteChunks, notes } from '@/server/db/schema'
import { chunkPlainText } from '@/server/ai/chunking'
import { embedTexts } from '@/server/ai/embeddings'
import { enqueueAndRun } from '@/server/jobs'
import { recordAudit } from '@/server/audit'
import { recordUsage } from '@/server/usage'
import { trackEvent } from '@/server/analytics'
import { notFound } from '@/lib/errors'
import type { WorkspaceAccess } from '@/server/permissions'

/**
 * §55 — Notes.
 *
 * A note is knowledge like any other: it is chunked and embedded so it shows up
 * in search and can be cited by Ask. Re-indexing is debounced through the job
 * queue, so autosave does not re-embed on every keystroke.
 */

export async function createNote(input: {
  access: WorkspaceAccess
  title?: string
  content?: string
  projectId?: string | null
  tags?: string[]
}): Promise<string> {
  const db = await getDb()
  const title = (input.title ?? '').trim().slice(0, 200)
  const content = input.content ?? ''
  const hasText = title.length > 0 || content.trim().length > 0
  const rows = await db
    .insert(notes)
    .values({
      workspaceId: input.access.workspaceId,
      projectId: input.projectId ?? null,
      createdBy: input.access.userId,
      title,
      content,
      tags: input.tags ?? [],
      embeddingStatus: hasText ? 'pending' : 'completed',
    })
    .returning({ id: notes.id })

  const note = rows[0]
  if (!note) throw new Error('No pudimos crear la nota.')

  await trackEvent('note_created', input.access)
  if (hasText) await scheduleNoteIndexing(input.access.workspaceId, note.id)
  return note.id
}

export async function updateNote(input: {
  access: WorkspaceAccess
  noteId: string
  title?: string
  content?: string
  projectId?: string | null
  tags?: string[]
}): Promise<void> {
  const db = await getDb()
  const existing = await getNote(input.noteId, input.access.workspaceId)

  const contentChanged = (input.content !== undefined && input.content !== existing.content) ||
    (input.title !== undefined && input.title.trim().slice(0, 200) !== existing.title)

  await db
    .update(notes)
    .set({
      ...(input.title !== undefined ? { title: input.title.trim().slice(0, 200) } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(contentChanged ? { embeddingStatus: 'pending' as const } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(notes.id, input.noteId), eq(notes.workspaceId, input.access.workspaceId)))

  if (contentChanged) await scheduleNoteIndexing(input.access.workspaceId, input.noteId)
}

async function scheduleNoteIndexing(workspaceId: string, noteId: string): Promise<void> {
  await enqueueAndRun({ workspaceId, resourceType: 'note', resourceId: noteId, type: 'note_embedding' })
}

export async function indexNote(noteId: string): Promise<void> {
  const db = await getDb()
  const [note] = await db.select().from(notes)
    .where(and(eq(notes.id, noteId), isNull(notes.deletedAt))).limit(1)
  // Deleting a note while its job waits should not recreate searchable content.
  if (!note) return

  const unchanged = and(
    eq(notes.id, noteId), isNull(notes.deletedAt),
    eq(notes.title, note.title), eq(notes.content, note.content),
  )
  const started = await db.update(notes).set({ embeddingStatus: 'processing' })
    .where(unchanged).returning({ id: notes.id })
  if (started.length === 0) return

  try {
    const body = [note.title, note.content].filter((s) => s.trim().length > 0).join('\n\n')
    const chunks = chunkPlainText(body)
    // Keep the previous searchable version until the complete replacement is
    // ready. A slow provider must not leave half-written or empty chunks.
    const { vectors, tokens } = await embedTexts(chunks.map(chunk => chunk.content))
    if (tokens > 0) await recordUsage(note.workspaceId, 'embedding_tokens', tokens)

    await db.transaction(async (tx) => {
      // This conditional update also holds the row lock through chunk commit.
      // A newer edit either wins first (so we discard this snapshot), or waits
      // and marks the note pending after the old version is committed.
      const current = await tx.update(notes).set({ embeddingStatus: 'completed' })
        .where(unchanged).returning({ id: notes.id })
      if (current.length === 0) return
      await tx.delete(noteChunks).where(eq(noteChunks.noteId, noteId))
      if (chunks.length > 0) {
        await tx.insert(noteChunks).values(chunks.map((chunk, index) => ({
          noteId,
          workspaceId: note.workspaceId,
          content: chunk.content,
          chunkIndex: chunk.index,
          tokenCount: chunk.tokenCount,
          embedding: vectors[index],
        })))
      }
    })
  } catch (err) {
    await db.update(notes).set({ embeddingStatus: 'failed' }).where(unchanged)
    throw err
  }
}

export async function getNote(noteId: string, workspaceId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, noteId), eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
    .limit(1)
  const note = rows[0]
  if (!note) throw notFound('No encontramos esta nota.')
  return note
}

export async function listNotes(workspaceId: string, limit = 50) {
  const db = await getDb()
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt))
    .limit(limit)
}

export async function softDeleteNote(noteId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await db
    .update(notes)
    .set({ deletedAt: new Date() })
    .where(and(eq(notes.id, noteId), eq(notes.workspaceId, access.workspaceId)))
  await recordAudit({
    action: 'note_deleted',
    workspaceId: access.workspaceId,
    actorId: access.userId,
    resourceType: 'note',
    resourceId: noteId,
  })
}

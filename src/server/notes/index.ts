import { and, asc, desc, eq, isNull } from 'drizzle-orm'
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
  const rows = await db
    .insert(notes)
    .values({
      workspaceId: input.access.workspaceId,
      projectId: input.projectId ?? null,
      createdBy: input.access.userId,
      title: (input.title ?? '').trim().slice(0, 200),
      content: input.content ?? '',
      tags: input.tags ?? [],
    })
    .returning({ id: notes.id })

  const note = rows[0]
  if (!note) throw new Error('No pudimos crear la nota.')

  await trackEvent('note_created', input.access)
  if ((input.content ?? '').trim().length > 0) await scheduleNoteIndexing(input.access.workspaceId, note.id)
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

  const contentChanged = input.content !== undefined && input.content !== existing.content

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
  const rows = await db.select().from(notes).where(eq(notes.id, noteId)).limit(1)
  const note = rows[0]
  if (!note) throw notFound('No encontramos esta nota.')

  await db.update(notes).set({ embeddingStatus: 'processing' }).where(eq(notes.id, noteId))

  try {
    // The title carries a lot of retrieval signal for short notes.
    const body = [note.title, note.content].filter((s) => s.trim().length > 0).join('\n\n')
    const chunks = chunkPlainText(body)

    await db.transaction(async (tx) => {
      await tx.delete(noteChunks).where(eq(noteChunks.noteId, noteId))
      if (chunks.length > 0) {
        await tx.insert(noteChunks).values(
          chunks.map((chunk) => ({
            noteId,
            workspaceId: note.workspaceId,
            content: chunk.content,
            chunkIndex: chunk.index,
            tokenCount: chunk.tokenCount,
          })),
        )
      }
    })

    const stored = await db
      .select({ id: noteChunks.id, content: noteChunks.content })
      .from(noteChunks)
      .where(eq(noteChunks.noteId, noteId))
      .orderBy(asc(noteChunks.chunkIndex))

    if (stored.length > 0) {
      const { vectors, tokens } = await embedTexts(stored.map((c) => c.content))
      for (const [i, chunk] of stored.entries()) {
        const vector = vectors[i]
        if (!vector) continue
        await db.update(noteChunks).set({ embedding: vector }).where(eq(noteChunks.id, chunk.id))
      }
      await recordUsage(note.workspaceId, 'embedding_tokens', tokens)
    }

    await db.update(notes).set({ embeddingStatus: 'completed' }).where(eq(notes.id, noteId))
  } catch (err) {
    await db.update(notes).set({ embeddingStatus: 'failed' }).where(eq(notes.id, noteId))
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

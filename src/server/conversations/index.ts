import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { conversations, messageSources, messages, type ConversationScope } from '@/server/db/schema'
import { notFound } from '@/lib/errors'
import { truncate } from '@/lib/text'
import type { Citation } from '@/server/ai/rag'
import type { WorkspaceAccess } from '@/server/permissions'

/** §118 — Conversation history, scoped to a workspace and owned by one user. */

export async function createConversation(input: {
  access: WorkspaceAccess
  scope: ConversationScope
  title: string
  projectId?: string | null
  documentId?: string | null
  meetingId?: string | null
  noteId?: string | null
}): Promise<string> {
  const db = await getDb()
  const rows = await db
    .insert(conversations)
    .values({
      workspaceId: input.access.workspaceId,
      userId: input.access.userId,
      scope: input.scope,
      title: truncate(input.title.trim() || 'Nueva conversación', 80),
      projectId: input.projectId ?? null,
      documentId: input.documentId ?? null,
      meetingId: input.meetingId ?? null,
      noteId: input.noteId ?? null,
    })
    .returning({ id: conversations.id })
  const conversation = rows[0]
  if (!conversation) throw new Error('No pudimos crear la conversación.')
  return conversation.id
}

/** Ownership is part of the lookup, so another user's id simply does not match. */
export async function getConversation(conversationId: string, access: WorkspaceAccess) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.id, conversationId),
        eq(conversations.workspaceId, access.workspaceId),
        eq(conversations.userId, access.userId),
        isNull(conversations.deletedAt),
      ),
    )
    .limit(1)
  const conversation = rows[0]
  if (!conversation) throw notFound('No encontramos esta conversación.')
  return conversation
}

export async function listConversations(access: WorkspaceAccess, limit = 40) {
  const db = await getDb()
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      scope: conversations.scope,
      updatedAt: conversations.updatedAt,
      meetingId: conversations.meetingId,
      documentId: conversations.documentId,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.workspaceId, access.workspaceId),
        eq(conversations.userId, access.userId),
        isNull(conversations.deletedAt),
      ),
    )
    .orderBy(desc(conversations.updatedAt))
    .limit(limit)
}

export async function getMessages(conversationId: string, access: WorkspaceAccess) {
  await getConversation(conversationId, access)
  const db = await getDb()

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))

  const sources = await db
    .select()
    .from(messageSources)
    .where(eq(messageSources.workspaceId, access.workspaceId))

  const byMessage = new Map<string, typeof sources>()
  for (const source of sources) {
    const list = byMessage.get(source.messageId) ?? []
    list.push(source)
    byMessage.set(source.messageId, list)
  }

  return rows.map((message) => ({
    ...message,
    sourceCount: byMessage.get(message.id)?.length ?? 0,
  }))
}

export async function appendMessage(input: {
  conversationId: string
  workspaceId: string
  role: 'user' | 'assistant'
  content: string
}): Promise<string> {
  const db = await getDb()
  const rows = await db
    .insert(messages)
    .values({
      conversationId: input.conversationId,
      workspaceId: input.workspaceId,
      role: input.role,
      content: input.content,
    })
    .returning({ id: messages.id })

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, input.conversationId))

  const message = rows[0]
  if (!message) throw new Error('No pudimos guardar el mensaje.')
  return message.id
}

/**
 * §35 — Persist citations against the chunk they came from, so a citation
 * disappears if its evidence is deleted rather than dangling.
 */
export async function saveCitations(input: {
  messageId: string
  workspaceId: string
  citations: Citation[]
}): Promise<void> {
  if (input.citations.length === 0) return
  const db = await getDb()
  await db.insert(messageSources).values(
    input.citations.map((citation) => ({
      messageId: input.messageId,
      workspaceId: input.workspaceId,
      citationIndex: citation.index,
      documentChunkId: citation.kind === 'document' ? citation.chunkId : null,
      noteChunkId: citation.kind === 'note' ? citation.chunkId : null,
      meetingChunkId: citation.kind === 'meeting' ? citation.chunkId : null,
      relevanceScore: citation.score,
    })),
  )
}

export async function renameConversation(
  conversationId: string,
  access: WorkspaceAccess,
  title: string,
): Promise<void> {
  await getConversation(conversationId, access)
  const db = await getDb()
  await db
    .update(conversations)
    .set({ title: truncate(title.trim() || 'Nueva conversación', 80), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId))
}

export async function deleteConversation(conversationId: string, access: WorkspaceAccess): Promise<void> {
  await getConversation(conversationId, access)
  const db = await getDb()
  await db
    .update(conversations)
    .set({ deletedAt: new Date() })
    .where(eq(conversations.id, conversationId))
}

/** History passed back to the model, trimmed to the recent turns (§111). */
export async function getRecentHistory(
  conversationId: string,
  limit = 6,
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  const db = await getDb()
  const rows = await db
    .select({ role: messages.role, content: messages.content })
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)

  return rows
    .reverse()
    .filter((row): row is { role: 'user' | 'assistant'; content: string } => row.role !== 'system')
    .map((row) => ({ role: row.role, content: truncate(row.content, 1500) }))
}

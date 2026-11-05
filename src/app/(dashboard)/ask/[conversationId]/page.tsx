import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requirePageContext } from '@/server/auth/guard'
import { getConversation, getMessages } from '@/server/conversations'
import { getProject } from '@/server/projects'
import { getDocument } from '@/server/documents'
import { getNote } from '@/server/notes'
import { getMeeting } from '@/server/meetings'
import { isAppError } from '@/lib/errors'
import { AskPanel } from '@/features/ask/ask-panel'
import { ConversationHistory, type ConversationMessageView } from '@/features/ask/conversation-history'
import type { AskScope } from '@/features/ask/use-ask'
import { ProviderNotice } from '@/components/shared/provider-notice'

export const metadata: Metadata = { title: 'Conversación guardada' }

export default async function ConversationPage({ params }: {
  params: Promise<{ conversationId: string }>
}) {
  const { access } = await requirePageContext('ai:use')
  const { conversationId } = await params
  if (!z.string().uuid().safeParse(conversationId).success) notFound()

  let conversation
  try {
    conversation = await getConversation(conversationId, access)
  } catch (err) {
    if (isAppError(err) && err.code === 'not_found') notFound()
    throw err
  }
  const messages = await getMessages(conversationId, access)
  const savedMessages: ConversationMessageView[] = messages.flatMap(message =>
    message.role === 'system' ? [] : [{
      id: message.id, role: message.role, content: message.content, citations: message.citations,
    }],
  )

  // A deleted source must never turn a scoped conversation into a global query.
  let scope: AskScope | null = null
  try {
    switch (conversation.scope) {
      case 'workspace': scope = { type: 'workspace' }; break
      case 'project':
        if (conversation.projectId) {
          await getProject(conversation.projectId, access.workspaceId)
          scope = { type: 'project', projectId: conversation.projectId }
        }
        break
      case 'document':
        if (conversation.documentId) {
          await getDocument(conversation.documentId, access.workspaceId)
          scope = { type: 'document', documentId: conversation.documentId }
        }
        break
      case 'note':
        if (conversation.noteId) {
          await getNote(conversation.noteId, access.workspaceId)
          scope = { type: 'note', noteId: conversation.noteId }
        }
        break
      case 'meeting':
        if (conversation.meetingId) {
          await getMeeting(conversation.meetingId, access.workspaceId)
          scope = { type: 'meeting', meetingId: conversation.meetingId }
        }
        break
    }
  } catch (err) {
    if (!isAppError(err) || err.code !== 'not_found') throw err
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/ask" className="text-sm text-brand hover:underline">Volver a preguntas y conversaciones</Link>
      <h1 className="break-words text-2xl font-bold tracking-tight text-ink">{conversation.title}</h1>
      <ProviderNotice />
      {scope ? (
        <AskPanel key={conversationId} scope={scope} initialConversation={{ conversationId, messages: savedMessages }} />
      ) : (
        <div className="space-y-5">
          <p role="status" className="rounded-lg bg-warning-soft p-3 text-sm text-ink">
            El recurso de esta conversación ya no está disponible. Puedes consultar el historial o iniciar una nueva pregunta.
          </p>
          <ConversationHistory messages={savedMessages} />
        </div>
      )}
    </div>
  )
}

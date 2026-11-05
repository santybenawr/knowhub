import { afterAll, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConversationHistory } from '@/features/ask/conversation-history'
import { closeDb } from '@/server/db/client'
import { createNote, softDeleteNote } from '@/server/notes'
import { createDocumentFromUpload } from '@/server/documents'
import { createMeeting, importTranscript } from '@/server/meetings'
import { drainJobs } from '@/server/jobs'
import { search } from '@/server/search'
import { citationHref, citationLabel } from '@/server/ai/rag'
import { appendMessage, createConversation, getMessages, saveCitations } from '@/server/conversations'
import { createTestTenant } from '../helpers/factories'

afterAll(async () => { await drainJobs(); await closeDb() })

it('reopens stored answers with their exact document, note and meeting sources', async () => {
  const { access } = await createTestTenant()
  const noteId = await createNote({ access, title: 'Proveedor elegido', content: 'Seleccionamos el proveedor B por su soporte.' })
  const { documentId } = await createDocumentFromUpload({
    access, title: 'Contrato proveedor', filename: 'contrato.txt', declaredMime: 'text/plain',
    buffer: Buffer.from('El proveedor B ofrece soporte técnico para nuestro equipo.'),
  })
  const meetingId = await createMeeting({ access, title: 'Decisión proveedor', source: 'transcript_import' })
  await importTranscript({ access, meetingId, transcript: '00:12 Ana: Seleccionamos al proveedor B para el proyecto.' })
  await drainJobs()
  const hits = await search({ workspaceId: access.workspaceId, query: 'proveedor' })
  expect(new Set(hits.map(hit => hit.kind)).size).toBe(3)
  const citations = hits.map((hit, i) => ({
    index: i + 1, kind: hit.kind, chunkId: hit.chunkId, resourceId: hit.resourceId,
    resourceTitle: hit.resourceTitle, href: citationHref(hit), label: citationLabel(hit),
    excerpt: hit.excerpt, score: hit.score, pageNumber: hit.pageNumber,
    startSeconds: hit.startSeconds, endSeconds: hit.endSeconds,
  }))
  const conversationId = await createConversation({ access, scope: 'workspace', title: '¿Qué proveedor?' })
  await appendMessage({ conversationId, workspaceId: access.workspaceId, role: 'user', content: '¿Qué proveedor?' })
  const messageId = await appendMessage({ conversationId, workspaceId: access.workspaceId, role: 'assistant', content: 'Proveedor B. [1] [2] [3]' })
  await saveCitations({ messageId, workspaceId: access.workspaceId, citations })

  const stored = await getMessages(conversationId, access)
  expect(stored.map(message => message.role)).toEqual(['user', 'assistant'])
  expect(stored[1]?.sourceCount).toBe(3)
  expect(stored[1]?.citations).toEqual(expect.arrayContaining([
    expect.objectContaining({ resourceId: noteId, href: `/notes/${noteId}` }),
    expect.objectContaining({ resourceId: documentId, href: expect.stringContaining(`/documents/${documentId}?chunk=`) }),
    expect.objectContaining({ resourceId: meetingId, href: `/meetings/${meetingId}?t=12` }),
  ]))

  await softDeleteNote(noteId, access)
  const afterDelete = await getMessages(conversationId, access)
  expect(afterDelete[1]?.content).toBe('Proveedor B. [1] [2] [3]')
  expect(afterDelete[1]?.citations).toHaveLength(2)
  expect(afterDelete[1]?.citations.some(citation => citation.resourceId === noteId)).toBe(false)
})

it('does not expose conversation text to another account or a different workspace', async () => {
  const owner = await createTestTenant()
  const outsider = await createTestTenant()
  const conversationId = await createConversation({ access: owner.access, scope: 'workspace', title: 'Privada' })
  await appendMessage({ conversationId, workspaceId: owner.access.workspaceId, role: 'user', content: 'Información privada de prueba' })
  await expect(getMessages(conversationId, outsider.access)).rejects.toMatchObject({ code: 'not_found' })
  await expect(getMessages(conversationId, { ...owner.access, userId: outsider.user.id })).rejects.toMatchObject({ code: 'not_found' })
  await expect(getMessages(conversationId, { ...owner.access, workspaceId: outsider.access.workspaceId })).rejects.toMatchObject({ code: 'not_found' })
})

it('preserves every concurrent question and out-of-order answer in their stored chronology', async () => {
  const { access } = await createTestTenant()
  const conversationId = await createConversation({ access, scope: 'workspace', title: 'Preguntas concurrentes' })
  const chronological = [
    { role: 'user' as const, content: 'Primera pregunta enviada' },
    { role: 'user' as const, content: 'Segunda pregunta enviada' },
    { role: 'assistant' as const, content: 'Respuesta terminada para la segunda pregunta' },
    { role: 'assistant' as const, content: 'Respuesta terminada para la primera pregunta' },
    { role: 'user' as const, content: 'Pregunta que todavía no tiene respuesta' },
  ]
  for (const message of chronological) {
    await appendMessage({ conversationId, workspaceId: access.workspaceId, ...message })
  }
  const saved = await getMessages(conversationId, access)
  expect(saved.map(message => ({ role: message.role, content: message.content }))).toEqual(chronological)
  const visible = saved.flatMap(message => message.role === 'system' ? [] : [{
    id: message.id, role: message.role, content: message.content, citations: message.citations,
  }])
  const html = renderToStaticMarkup(createElement(ConversationHistory, { messages: visible }))
  let previous = -1
  for (const message of chronological) {
    expect(html.split(message.content)).toHaveLength(2)
    expect(html.indexOf(message.content)).toBeGreaterThan(previous)
    previous = html.indexOf(message.content)
  }
  expect(html).not.toContain('role="alert"')
  expect(html).toContain('Mensajes guardados')
})

import { afterAll, afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTestTenant, createTestWorkspace } from '../helpers/factories'
import { createNote } from '@/server/notes'
import { drainJobs } from '@/server/jobs'
import { closeDb } from '@/server/db/client'
import { getAIProvider, setAIProvider } from '@/server/ai'
import { NO_EVIDENCE_ANSWER } from '@/server/ai/prompts'
import { POST } from '@/app/api/ask/route'
import { createConversation, getMessages } from '@/server/conversations'

const guard = vi.hoisted(() => vi.fn())
vi.mock('@/server/auth/guard', () => ({ requireApiContext: guard }))

afterEach(() => { setAIProvider(null); vi.clearAllMocks() })
afterAll(async () => { await drainJobs(); await closeDb() })

it.each(['Una afirmación sin fuente.', 'Una fuente inventada [99].'])('does not send provisional unsupported text: %s', async text => {
  const { user, access } = await createTestTenant()
  guard.mockResolvedValue({ user, access })
  const noteId = await createNote({ access, title: 'Proveedor B', content: 'Seleccionamos el proveedor B por su soporte técnico.' })
  await drainJobs()
  const base = getAIProvider()
  const streamText = vi.fn(async function* () { yield text.slice(0, 12); yield text.slice(12) })
  setAIProvider({
    name: 'invalid-citations', isMock: true, supportsStreaming: true,
    createEmbedding: base.createEmbedding.bind(base),
    generateText: base.generateText.bind(base),
    generateStructuredOutput: base.generateStructuredOutput.bind(base),
    streamText,
  })
  const response = await POST(new NextRequest('http://localhost:3010/api/ask', {
    method: 'POST', body: JSON.stringify({ question: '¿Qué proveedor seleccionamos?', scope: { type: 'note', noteId } }),
    headers: { 'Content-Type': 'application/json' },
  }))
  expect(response.status).toBe(200)
  const frames = (await response.text()).trim().split('\n').map(line => JSON.parse(line))
  expect(streamText).toHaveBeenCalledOnce()
  expect(frames.filter(f => f.type === 'delta')).toEqual([{ type: 'delta', value: NO_EVIDENCE_ANSWER }])
  expect(frames.filter(f => f.type === 'citations')).toEqual([{ type: 'citations', value: [] }])
  expect(frames.at(-1).type).toBe('done')
})

it('rejects an unauthenticated request before processing', async () => {
  guard.mockResolvedValue(null)
  const response = await POST(new NextRequest('http://localhost:3010/api/ask', { method: 'POST', body: '{}' }))
  expect(response.status).toBe(401)
})

it('rejects changing the scope of existing conversation history', async () => {
  const { user, access } = await createTestTenant()
  guard.mockResolvedValue({ user, access })
  const noteId = await createNote({ access, title: 'Nota', content: 'Proveedor B' })
  const conversationId = await createConversation({ access, scope: 'workspace', title: 'Global' })
  const response = await POST(new NextRequest('http://localhost:3010/api/ask', {
    method: 'POST', body: JSON.stringify({ question: '¿Qué proveedor?', conversationId, scope: { type: 'note', noteId } }),
  }))
  expect(response.status).toBe(422)
  expect(await response.json()).toMatchObject({ code: 'validation' })
  expect(await getMessages(conversationId, access)).toEqual([])
  await drainJobs()
})

it('does not mix a second workspace into the active workspace conversation', async () => {
  const { user, access } = await createTestTenant()
  guard.mockResolvedValue({ user, access })
  const otherAccess = await createTestWorkspace(user.id)
  const noteId = await createNote({ access: otherAccess, title: 'Otra organización', content: 'Proveedor B' })
  const response = await POST(new NextRequest('http://localhost:3010/api/ask', {
    method: 'POST', body: JSON.stringify({ question: '¿Qué proveedor?', scope: { type: 'note', noteId } }),
  }))
  expect(response.status).toBe(404)
  await drainJobs()
})

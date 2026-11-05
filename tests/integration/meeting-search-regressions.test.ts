import { afterAll, expect, it } from 'vitest'
import { closeDb } from '@/server/db/client'
import { createNote } from '@/server/notes'
import { createMeeting, getMeeting, getTranscript, importTranscript } from '@/server/meetings'
import { drainJobs } from '@/server/jobs'
import { search } from '@/server/search'
import { createTestTenant } from '../helpers/factories'

afterAll(async () => { await drainJobs(); await closeDb() })

it('returns an empty search for stopwords rather than every stored resource with zero relevance', async () => {
  const { access } = await createTestTenant()
  await createNote({ access, title: 'Proveedor', content: 'Seleccionamos el proveedor B por su soporte técnico.' })
  await drainJobs()
  expect(await search({ workspaceId: access.workspaceId, query: 'de la y' })).toEqual([])
  expect(await search({ workspaceId: access.workspaceId, query: 'proveedor' })).toHaveLength(1)
})

it('allows a short genuine transcript and completes its pipeline', async () => {
  const { access } = await createTestTenant()
  const meetingId = await createMeeting({ access, source: 'transcript_import' })
  await importTranscript({ access, meetingId, transcript: 'Ana: Aprobado.' })
  await drainJobs()
  expect((await getTranscript(meetingId, access.workspaceId))[0]?.text).toBe('Aprobado.')
  expect((await getMeeting(meetingId, access.workspaceId)).status).toBe('ready')
})

it.each(['   ', 'x'.repeat(200_001)])('rejects empty or oversized transcripts before modifying the meeting', async transcript => {
  const { access } = await createTestTenant()
  const meetingId = await createMeeting({ access, source: 'transcript_import' })
  await expect(importTranscript({ access, meetingId, transcript })).rejects.toMatchObject({ code: 'validation' })
  expect((await getMeeting(meetingId, access.workspaceId)).status).toBe('draft')
  expect(await getTranscript(meetingId, access.workspaceId)).toEqual([])
})

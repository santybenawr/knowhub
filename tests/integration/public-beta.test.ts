import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { closeDb } from '@/server/db/client'
import { createMeeting, attachAudio, importTranscript, getTranscript } from '@/server/meetings'
import { inviteMember, acceptInvitation } from '@/server/workspaces'
import { validateDocumentFile } from '@/server/documents/validation'
import { createTestTenant } from '../helpers/factories'
import { drainJobs } from '@/server/jobs'

afterEach(() => vi.unstubAllEnvs())
afterAll(async () => { await drainJobs(); await closeDb() })

describe('public beta boundaries', () => {
  it('imports user text but refuses recording and audio uploads on the server', async () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'true')
    const { access } = await createTestTenant()
    for (const source of ['recording', 'upload'] as const) {
      await expect(createMeeting({ access, source })).rejects.toThrow('transcripción pegada')
    }
    const meetingId = await createMeeting({ access, source: 'transcript_import' })
    await importTranscript({ access, meetingId, transcript: '00:00 Ana: El lanzamiento será el viernes.\n00:12 Luis: Yo preparo los documentos.' })
    await drainJobs()
    expect((await getTranscript(meetingId, access.workspaceId)).map(s => s.text).join(' ')).toContain('lanzamiento será el viernes')
    await expect(attachAudio({ access, meetingId, buffer: Buffer.from('audio'), filename: 'test.wav', declaredMime: 'audio/wav' })).rejects.toThrow('carga de audio')
  })

  it('refuses team access through unverified email identities', async () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'true')
    const { access, user } = await createTestTenant()
    await expect(inviteMember({ access, email: 'other@knowhub.test', role: 'VIEWER' })).rejects.toThrow('verificación de correo')
    await expect(acceptInvitation('any-token', user.id)).rejects.toThrow('no están disponibles')
  })

  it('rejects documents over the hosted upload limit before storing them', () => {
    vi.stubEnv('NEXT_PUBLIC_KNOWHUB_BETA', 'true')
    expect(() => validateDocumentFile({ buffer: Buffer.alloc(4 * 1024 * 1024 + 1, 'a'), filename: 'large.txt', declaredMime: 'text/plain' })).toThrow('supera el máximo')
  })
})

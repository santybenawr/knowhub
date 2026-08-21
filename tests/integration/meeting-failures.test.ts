import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { meetings } from '@/server/db/schema'
import { attachAudio, createMeeting, getMeeting, getResolvedTranscript } from '@/server/meetings'
import { analyzeMeeting, indexMeeting, transcribeMeeting } from '@/server/meetings/pipeline'
import { setTranscriptionProvider, type TranscriptionProvider } from '@/server/transcription'
import { getAIProvider, setAIProvider, type AIProvider } from '@/server/ai'
import { getStorageProvider } from '@/server/storage'
import { drainJobs } from '@/server/jobs'
import { createTestTenant } from '../helpers/factories'
import { makeWavFixture } from '../fixtures/transcript'

afterEach(() => {
  setTranscriptionProvider(null)
  setAIProvider(null)
})

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

const failingTranscription: TranscriptionProvider = {
  name: 'failing',
  isMock: true,
  supportsDiarization: false,
  transcribe: async () => {
    throw new Error('El proveedor de transcripción no está disponible.')
  },
}

/**
 * §127/§128/§129 — Failure containment.
 *
 * Each stage fails independently, and a failure never destroys what the earlier
 * stage produced. These are the paths that decide whether a user loses a
 * meeting or merely loses a feature of it.
 */
describe('transcription failure', () => {
  it('keeps the audio and reports the failure without deleting anything', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Reunión que falla' })

    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(2),
      filename: 'a.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 2,
    })
    await drainJobs()

    setTranscriptionProvider(failingTranscription)
    await expect(transcribeMeeting(meetingId)).rejects.toThrow()

    const meeting = await getMeeting(meetingId, access.workspaceId)
    expect(meeting.transcriptionStatus).toBe('failed')
    expect(meeting.transcriptionError).toContain('no está disponible')

    // §127 — the audio is still there and still playable.
    expect(meeting.audioStoragePath).toBeTruthy()
    expect(await getStorageProvider().exists(meeting.audioStoragePath as string)).toBe(true)
  })

  it('recovers on retry once the provider works again', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Reunión que se recupera' })
    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(2),
      filename: 'a.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 2,
    })

    setTranscriptionProvider(failingTranscription)
    await expect(transcribeMeeting(meetingId)).rejects.toThrow()

    setTranscriptionProvider(null)
    await transcribeMeeting(meetingId)
    await drainJobs()

    const meeting = await getMeeting(meetingId, access.workspaceId)
    expect(meeting.transcriptionStatus).toBe('completed')
    expect(meeting.transcriptionError).toBeNull()

    const { segments } = await getResolvedTranscript(meetingId, access.workspaceId)
    expect(segments.length).toBeGreaterThan(0)
  })
})

describe('analysis failure', () => {
  it('leaves the transcript readable and the meeting still indexable', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Análisis roto' })
    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(2),
      filename: 'a.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 2,
    })
    await transcribeMeeting(meetingId)

    const real = getAIProvider()
    const failingAnalysis: AIProvider = {
      ...real,
      name: 'failing',
      isMock: true,
      supportsStreaming: false,
      generateStructuredOutput: async () => {
        throw new Error('El modelo no respondió.')
      },
      generateText: real.generateText.bind(real),
      streamText: real.streamText.bind(real),
      createEmbedding: real.createEmbedding.bind(real),
    }
    setAIProvider(failingAnalysis)

    await expect(analyzeMeeting(meetingId)).rejects.toThrow()

    const failed = await getMeeting(meetingId, access.workspaceId)
    expect(failed.analysisStatus).toBe('failed')
    expect(failed.analysisError).toContain('no respondió')
    // §128 — the transcript survived the analysis failure.
    expect(failed.transcriptionStatus).toBe('completed')
    const { segments } = await getResolvedTranscript(meetingId, access.workspaceId)
    expect(segments.length).toBeGreaterThan(0)

    // §128 — "Volver a analizar" recovers once the provider is back, without
    // re-running (or re-paying for) transcription.
    setAIProvider(null)
    await analyzeMeeting(meetingId)
    await drainJobs()

    const recovered = await getMeeting(meetingId, access.workspaceId)
    expect(recovered.analysisStatus).toBe('completed')
    expect(recovered.analysisError).toBeNull()
  })
})

describe('embedding failure', () => {
  it('still marks the meeting ready so it can be opened and played', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Embeddings rotos' })
    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(2),
      filename: 'a.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 2,
    })
    await transcribeMeeting(meetingId)

    const real = getAIProvider()
    setAIProvider({
      ...real,
      name: 'failing-embeddings',
      isMock: true,
      supportsStreaming: false,
      generateText: real.generateText.bind(real),
      streamText: real.streamText.bind(real),
      generateStructuredOutput: real.generateStructuredOutput.bind(real),
      createEmbedding: async () => {
        throw new Error('Sin cuota de embeddings.')
      },
    })

    await expect(indexMeeting(meetingId)).rejects.toThrow()
    setAIProvider(null)

    const db = await getDb()
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, meetingId))
    expect(meeting?.embeddingStatus).toBe('failed')
    // §129 — the meeting is available even though smart search is not.
    expect(meeting?.status).toBe('ready')
  })
})

describe('audio replacement', () => {
  it('removes the previous object instead of leaking storage', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Audio reemplazado' })

    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(1),
      filename: 'a.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 1,
    })
    const first = (await getMeeting(meetingId, access.workspaceId)).audioStoragePath as string

    await attachAudio({
      access,
      meetingId,
      buffer: makeWavFixture(2),
      filename: 'b.wav',
      declaredMime: 'audio/wav',
      durationSeconds: 2,
    })
    const second = (await getMeeting(meetingId, access.workspaceId)).audioStoragePath as string

    expect(second).not.toBe(first)
    expect(await getStorageProvider().exists(first)).toBe(false)
    expect(await getStorageProvider().exists(second)).toBe(true)
  })
})

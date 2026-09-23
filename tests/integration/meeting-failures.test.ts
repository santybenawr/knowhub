import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
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
  vi.restoreAllMocks()
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


describe('audio preservation regressions', () => {
  it.each([-1, NaN, Infinity])('rejects invalid audio duration %s before storing it', async durationSeconds => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access })
    const upload = vi.spyOn(getStorageProvider(), 'upload')
    await expect(attachAudio({ access, meetingId, buffer: makeWavFixture(1), filename: 'audio.wav', declaredMime: 'audio/wav', durationSeconds })).rejects.toThrow('duración')
    expect(upload).not.toHaveBeenCalled()
    expect((await getMeeting(meetingId, access.workspaceId)).audioStoragePath).toBeNull()
  })

  it('keeps the existing audio and reference when replacement upload fails', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Preserve recording' })
    const firstAudio = makeWavFixture(1)
    await attachAudio({ access, meetingId, buffer: firstAudio, filename: 'old.wav', declaredMime: 'audio/wav' })
    await drainJobs()
    const before = await getMeeting(meetingId, access.workspaceId)
    const storage = getStorageProvider()
    vi.spyOn(storage, 'upload').mockRejectedValueOnce(new Error('Upload unavailable'))
    await expect(attachAudio({ access, meetingId, buffer: makeWavFixture(2), filename: 'new.wav', declaredMime: 'audio/wav' })).rejects.toThrow('Upload unavailable')
    expect((await getMeeting(meetingId, access.workspaceId)).audioStoragePath).toBe(before.audioStoragePath)
    expect((await storage.read(before.audioStoragePath!)).body).toEqual(firstAudio)
  })
})


it('preserves audio if saving the replacement reference fails', async () => {
  const { access } = await createTestTenant()
  const meetingId = await createMeeting({ access })
  await attachAudio({ access, meetingId, buffer: makeWavFixture(1), filename: 'old.wav', declaredMime: 'audio/wav' })
  await drainJobs()
  const before = await getMeeting(meetingId, access.workspaceId)
  const db = await getDb()
  const storage = getStorageProvider()
  const upload = vi.spyOn(storage, 'upload')
  vi.spyOn(db, 'update').mockImplementationOnce(() => { throw new Error('Database unavailable') })
  await expect(attachAudio({ access, meetingId, buffer: makeWavFixture(2), filename: 'new.wav', declaredMime: 'audio/wav' })).rejects.toThrow('Database unavailable')
  expect((await getMeeting(meetingId, access.workspaceId)).audioStoragePath).toBe(before.audioStoragePath)
  expect(await storage.exists(before.audioStoragePath!)).toBe(true)
  expect(await storage.exists(upload.mock.calls[0]![0].path)).toBe(false)
})

it('does not overwrite a concurrently attached audio reference', async () => {
  const { access } = await createTestTenant()
  const meetingId = await createMeeting({ access })
  const storage = getStorageProvider()
  const originalUpload = storage.upload.bind(storage)
  let release!: () => void
  const bothUploading = new Promise<void>(resolve => { release = resolve })
  let uploads = 0
  const paths: string[] = []
  vi.spyOn(storage, 'upload').mockImplementation(async input => {
    const result = await originalUpload(input)
    paths.push(input.path)
    if (++uploads === 2) release()
    await bothUploading
    return result
  })
  const results = await Promise.allSettled([1, 2].map(seconds => attachAudio({ access, meetingId, buffer: makeWavFixture(seconds), filename: 'audio.wav', declaredMime: 'audio/wav' })))
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
  expect(results.filter(r => r.status === 'rejected')).toHaveLength(1)
  const current = await getMeeting(meetingId, access.workspaceId)
  for (const path of paths) expect(await storage.exists(path)).toBe(path === current.audioStoragePath)
  await drainJobs()
})

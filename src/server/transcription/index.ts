import { getProviderStatus, getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { MockTranscriptionProvider } from './mock'
import { OpenAITranscriptionProvider } from './openai'
import type { TranscriptionProvider } from './types'

export * from './types'
export { MockTranscriptionProvider } from './mock'
export { OpenAITranscriptionProvider } from './openai'
export { parseTranscriptText, speakerKeyFrom, parseTimecode } from './parse-transcript'

let cached: TranscriptionProvider | null = null

export function getTranscriptionProvider(): TranscriptionProvider {
  if (cached) return cached
  const env = getServerEnv()
  const resolved = getProviderStatus().transcription

  if (resolved === 'openai') {
    cached = OpenAITranscriptionProvider.fromEnv()
    return cached
  }

  // §78 — never silently mock in production.
  if (env.NODE_ENV === 'production' && env.TRANSCRIPTION_PROVIDER !== 'mock') {
    throw providerError(
      'La transcripción no está configurada. Define TRANSCRIPTION_API_KEY (u OPENAI_API_KEY), o importa la transcripción manualmente.',
    )
  }

  cached = new MockTranscriptionProvider()
  return cached
}

export function setTranscriptionProvider(provider: TranscriptionProvider | null): void {
  cached = provider
}

export function isTranscriptionMocked(): boolean {
  try {
    return getTranscriptionProvider().isMock
  } catch {
    return false
  }
}

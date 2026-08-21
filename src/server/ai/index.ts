import { getProviderStatus, getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { MockAIProvider } from './mock'
import { OpenAIProvider } from './openai'
import type { AIProvider } from './types'

export * from './types'
export { MockAIProvider } from './mock'
export { OpenAIProvider } from './openai'
export { cosineSimilarity, localEmbedding } from './local-embedding'

let cached: AIProvider | null = null

/**
 * §10/§78/§90 — Provider selection.
 *
 * Missing credentials never stop the app from booting: the mock provider keeps
 * development and CI fully functional. Production is the exception — falling
 * back silently there would ship extractive stub answers as if they were the
 * model, so it requires an explicit `AI_PROVIDER=mock` to opt in.
 */
export function getAIProvider(): AIProvider {
  if (cached) return cached
  const env = getServerEnv()
  const resolved = getProviderStatus().ai

  if (resolved === 'openai') {
    cached = OpenAIProvider.fromEnv()
    return cached
  }

  if (env.NODE_ENV === 'production' && env.AI_PROVIDER !== 'mock') {
    throw providerError(
      'La IA no está configurada. Define OPENAI_API_KEY, o AI_PROVIDER=mock para usar explícitamente el proveedor local.',
    )
  }

  cached = new MockAIProvider(env.EMBEDDING_DIMENSIONS)
  return cached
}

/** Test seam: inject a provider, or reset with `null`. */
export function setAIProvider(provider: AIProvider | null): void {
  cached = provider
}

/** True when AI features are answering without an external model. */
export function isAiMocked(): boolean {
  try {
    return getAIProvider().isMock
  } catch {
    return false
  }
}

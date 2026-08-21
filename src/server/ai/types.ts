import type { z } from 'zod'

/** §89 — AI boundary. Nothing above this layer knows which vendor is in use. */

export type AiRole = 'system' | 'user' | 'assistant'

export type AiMessage = {
  role: AiRole
  content: string
}

export type AiUsage = {
  inputTokens: number
  outputTokens: number
}

export type GenerateTextInput = {
  messages: AiMessage[]
  temperature?: number
  maxTokens?: number
}

export type GenerateTextResult = {
  text: string
  usage: AiUsage
  model: string
}

export type StructuredInput<T> = {
  messages: AiMessage[]
  schema: z.ZodType<T>
  schemaName: string
  temperature?: number
}

export type StructuredResult<T> = {
  data: T
  usage: AiUsage
  model: string
}

export type EmbeddingResult = {
  embeddings: number[][]
  usage: AiUsage
  model: string
  dimensions: number
}

export interface AIProvider {
  readonly name: string
  /** True for providers that never call an external service. */
  readonly isMock: boolean
  readonly supportsStreaming: boolean
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>
  generateStructuredOutput<T>(input: StructuredInput<T>): Promise<StructuredResult<T>>
  streamText(input: GenerateTextInput): AsyncIterable<string>
  createEmbedding(texts: string[]): Promise<EmbeddingResult>
}

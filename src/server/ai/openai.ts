import { z } from 'zod'
import { getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { estimateTokens } from '@/lib/text'
import type {
  AIProvider,
  EmbeddingResult,
  GenerateTextInput,
  GenerateTextResult,
  StructuredInput,
  StructuredResult,
} from './types'

const usageSchema = z
  .object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() })
  .optional()

const chatResponseSchema = z.object({
  choices: z.array(z.object({ message: z.object({ content: z.string().nullable() }) })).min(1),
  usage: usageSchema,
})

const embeddingResponseSchema = z.object({
  data: z.array(z.object({ embedding: z.array(z.number()) })),
  usage: usageSchema,
})

/**
 * OpenAI-compatible provider.
 *
 * Uses `fetch` against the REST API rather than the SDK: the surface KnowHub
 * needs is four calls, and `OPENAI_BASE_URL` then also points at any
 * OpenAI-compatible gateway without further changes.
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly isMock = false
  readonly supportsStreaming = true

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string
  private readonly embeddingModel: string
  private readonly dimensions: number

  constructor(config: {
    apiKey: string
    baseUrl: string
    model: string
    embeddingModel: string
    dimensions: number
  }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.model = config.model
    this.embeddingModel = config.embeddingModel
    this.dimensions = config.dimensions
  }

  static fromEnv(): OpenAIProvider {
    const env = getServerEnv()
    if (!env.OPENAI_API_KEY) {
      throw providerError('AI_PROVIDER=openai requiere OPENAI_API_KEY.')
    }
    return new OpenAIProvider({
      apiKey: env.OPENAI_API_KEY,
      baseUrl: env.OPENAI_BASE_URL,
      model: env.AI_MODEL,
      embeddingModel: env.EMBEDDING_MODEL,
      dimensions: env.EMBEDDING_DIMENSIONS,
    })
  }

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      // The upstream body can echo prompt content; keep it out of the message.
      console.error('[knowhub] openai error', res.status, detail.slice(0, 500))
      throw providerError(`El proveedor de IA respondió con un error (${res.status}).`)
    }
    return res
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const res = await this.post('/chat/completions', {
      model: this.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1200,
    })
    const parsed = chatResponseSchema.parse(await res.json())
    return {
      text: parsed.choices[0]?.message.content ?? '',
      usage: {
        inputTokens: parsed.usage?.prompt_tokens ?? 0,
        outputTokens: parsed.usage?.completion_tokens ?? 0,
      },
      model: this.model,
    }
  }

  async generateStructuredOutput<T>(input: StructuredInput<T>): Promise<StructuredResult<T>> {
    const res = await this.post('/chat/completions', {
      model: this.model,
      messages: [
        ...input.messages,
        {
          role: 'system',
          content:
            'Responde únicamente con un objeto JSON válido, sin bloques de código ni texto adicional.',
        },
      ],
      temperature: input.temperature ?? 0,
      response_format: { type: 'json_object' },
    })
    const parsed = chatResponseSchema.parse(await res.json())
    const raw = parsed.choices[0]?.message.content ?? '{}'

    let json: unknown
    try {
      json = JSON.parse(stripCodeFence(raw))
    } catch {
      throw providerError('El proveedor de IA devolvió un JSON inválido.')
    }

    const validated = input.schema.safeParse(json)
    if (!validated.success) {
      throw providerError('La respuesta del proveedor de IA no cumple el esquema esperado.', {
        schema: input.schemaName,
      })
    }

    return {
      data: validated.data,
      usage: {
        inputTokens: parsed.usage?.prompt_tokens ?? 0,
        outputTokens: parsed.usage?.completion_tokens ?? 0,
      },
      model: this.model,
    }
  }

  async *streamText(input: GenerateTextInput): AsyncIterable<string> {
    const res = await this.post('/chat/completions', {
      model: this.model,
      messages: input.messages,
      temperature: input.temperature ?? 0.2,
      max_tokens: input.maxTokens ?? 1200,
      stream: true,
    })
    if (!res.body) throw providerError('El proveedor de IA no devolvió un stream.')

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (payload === '[DONE]') return
        try {
          const chunk = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>
          }
          const delta = chunk.choices?.[0]?.delta?.content
          if (delta) yield delta
        } catch {
          // Ignore keep-alive and malformed partial frames.
        }
      }
    }
  }

  async createEmbedding(texts: string[]): Promise<EmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], usage: { inputTokens: 0, outputTokens: 0 }, model: this.embeddingModel, dimensions: this.dimensions }
    }
    const res = await this.post('/embeddings', {
      model: this.embeddingModel,
      input: texts,
      dimensions: this.dimensions,
    })
    const parsed = embeddingResponseSchema.parse(await res.json())
    return {
      embeddings: parsed.data.map((d) => d.embedding),
      usage: {
        inputTokens: parsed.usage?.prompt_tokens ?? texts.reduce((n, t) => n + estimateTokens(t), 0),
        outputTokens: 0,
      },
      model: this.embeddingModel,
      dimensions: this.dimensions,
    }
  }
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim()
}

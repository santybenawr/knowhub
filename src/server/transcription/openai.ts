import { z } from 'zod'
import { getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import type { TranscribeInput, TranscriptionProvider, TranscriptionResult } from './types'

const verboseSchema = z.object({
  text: z.string(),
  language: z.string().optional(),
  duration: z.number().optional(),
  segments: z
    .array(
      z.object({
        id: z.union([z.number(), z.string()]),
        start: z.number(),
        end: z.number(),
        text: z.string(),
        no_speech_prob: z.number().optional(),
        avg_logprob: z.number().optional(),
      }),
    )
    .optional(),
})

/**
 * Whisper-compatible transcription over the REST API.
 *
 * Whisper returns timestamped segments but no speaker labels, so
 * `supportsDiarization` is false and every segment comes back without a
 * speaker rather than with an invented one (§79, §29).
 */
export class OpenAITranscriptionProvider implements TranscriptionProvider {
  readonly name = 'openai'
  readonly isMock = false
  readonly supportsDiarization = false

  private readonly apiKey: string
  private readonly baseUrl: string
  private readonly model: string

  constructor(config: { apiKey: string; baseUrl: string; model: string }) {
    this.apiKey = config.apiKey
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.model = config.model
  }

  static fromEnv(): OpenAITranscriptionProvider {
    const env = getServerEnv()
    const apiKey = env.TRANSCRIPTION_API_KEY ?? env.OPENAI_API_KEY
    if (!apiKey) {
      throw providerError('TRANSCRIPTION_PROVIDER=openai requiere TRANSCRIPTION_API_KEY u OPENAI_API_KEY.')
    }
    return new OpenAITranscriptionProvider({
      apiKey,
      baseUrl: env.TRANSCRIPTION_BASE_URL,
      model: env.TRANSCRIPTION_MODEL,
    })
  }

  async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(input.audio)], { type: input.mimeType }), input.filename)
    form.append('model', this.model)
    form.append('response_format', 'verbose_json')
    form.append('timestamp_granularities[]', 'segment')
    if (input.language) form.append('language', input.language)

    const res = await fetch(`${this.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[knowhub] transcription error', res.status, detail.slice(0, 500))
      throw providerError(`El proveedor de transcripción respondió con un error (${res.status}).`)
    }

    const parsed = verboseSchema.parse(await res.json())
    const segments = (parsed.segments ?? []).map((s, index) => ({
      id: String(s.id ?? index),
      start: s.start,
      end: s.end,
      text: s.text.trim(),
      // Whisper reports log-probabilities, not a calibrated confidence; the
      // closest honest mapping is the complement of its no-speech probability.
      confidence: s.no_speech_prob !== undefined ? 1 - s.no_speech_prob : undefined,
    }))

    return {
      text: parsed.text,
      language: parsed.language,
      durationSeconds: parsed.duration,
      // A provider that returns no segments still gives usable text; wrap it in
      // a single segment so downstream code always has timestamps to work with.
      segments:
        segments.length > 0
          ? segments
          : [{ id: '0', start: 0, end: parsed.duration ?? 0, text: parsed.text.trim() }],
      model: this.model,
      isMock: false,
    }
  }
}

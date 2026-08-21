/**
 * §75/§76 — Transcription boundary.
 *
 * Kept separate from `AIProvider` even when the same vendor serves both: they
 * fail differently, are billed differently, and a deployment may well want
 * Whisper for audio and another model for reasoning.
 */

export type TranscriptionSegment = {
  id: string
  start: number
  end: number
  text: string
  /** Present only when the provider performs diarization (§79). */
  speakerId?: string
  confidence?: number
}

export type TranscriptionResult = {
  text: string
  language?: string
  durationSeconds?: number
  segments: TranscriptionSegment[]
  /**
   * Display names discovered in the source (an imported transcript labels its
   * speakers by name). Never inferred (§29) — only carried through when the
   * source stated them.
   */
  speakerNames?: Record<string, string>
  /** True when produced by the development provider, so the UI can say so. */
  isMock?: boolean
  model?: string
}

export type TranscribeInput = {
  audio: Buffer
  mimeType: string
  filename: string
  /** ISO-639-1 hint; `undefined` means auto-detect. */
  language?: string | undefined
}

export interface TranscriptionProvider {
  readonly name: string
  readonly isMock: boolean
  readonly supportsDiarization: boolean
  transcribe(input: TranscribeInput): Promise<TranscriptionResult>
}

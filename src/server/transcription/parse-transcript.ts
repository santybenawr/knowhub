import type { TranscriptionResult, TranscriptionSegment } from './types'

/**
 * §57 — Transcript import.
 *
 * Parses transcripts pasted or uploaded by the user. This is a real ingestion
 * path, not a stand-in: it is the way to get full meeting intelligence when no
 * transcription provider is configured.
 *
 * Recognised line shapes:
 *   00:00 Santiago: texto
 *   [00:23:41] Santiago: texto
 *   00:23:41 - Santiago: texto
 *   Santiago: texto              (no timestamp)
 *   texto                        (plain paragraph)
 */

const LINE_PATTERN =
  /^\s*\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d{1,3})?)\]?\s*(?:[-–—]\s*)?(?:([^:\n]{1,60}):)?\s*(.*)$/
const SPEAKER_ONLY_PATTERN = /^\s*([^:\n]{1,60}):\s*(.+)$/

export function parseTimecode(value: string): number | null {
  const normalized = value.replace(',', '.')
  const parts = normalized.split(':').map(Number)
  if (parts.some((n) => !Number.isFinite(n))) return null
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0)
  if (parts.length === 3) return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
  return null
}

/** Normalises a speaker label into a stable key ("Santiago" -> "SANTIAGO"). */
export function speakerKeyFrom(label: string): string {
  const cleaned = label
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned.slice(0, 40) || 'SPEAKER'
}

export function parseTranscriptText(
  raw: string,
  options: { fallbackSecondsPerLine?: number } = {},
): TranscriptionResult {
  const secondsPerLine = options.fallbackSecondsPerLine ?? 8
  const lines = raw.split('\n')
  const segments: TranscriptionSegment[] = []
  const speakerLabels = new Map<string, string>()

  let cursor = 0
  let pendingSpeaker: string | null = null

  for (const line of lines) {
    if (line.trim() === '') continue

    let timestamp: number | null = null
    let speakerLabel: string | null = null
    let text = ''

    const timed = line.match(LINE_PATTERN)
    if (timed && timed[1]) {
      timestamp = parseTimecode(timed[1])
      speakerLabel = timed[2]?.trim() || null
      text = (timed[3] ?? '').trim()
    } else {
      const speakerOnly = line.match(SPEAKER_ONLY_PATTERN)
      if (speakerOnly && !/^https?$/i.test(speakerOnly[1] ?? '')) {
        speakerLabel = speakerOnly[1]?.trim() || null
        text = (speakerOnly[2] ?? '').trim()
      } else {
        text = line.trim()
      }
    }

    // "00:23:41 Santiago:" on its own line labels the paragraph that follows.
    if (text === '' && speakerLabel) {
      pendingSpeaker = speakerLabel
      if (timestamp !== null) cursor = timestamp
      continue
    }
    if (text === '') continue

    const effectiveSpeaker = speakerLabel ?? pendingSpeaker
    pendingSpeaker = speakerLabel ? null : pendingSpeaker

    const start = timestamp ?? cursor
    const previous = segments[segments.length - 1]
    if (previous && previous.end < start) previous.end = start

    const end = start + Math.max(2, Math.round(text.length / 14))
    cursor = timestamp !== null ? timestamp + secondsPerLine : start + secondsPerLine

    let speakerId: string | undefined
    if (effectiveSpeaker) {
      const key = speakerKeyFrom(effectiveSpeaker)
      speakerLabels.set(key, effectiveSpeaker.trim())
      speakerId = key
    }

    segments.push({
      id: String(segments.length),
      start,
      end,
      text,
      ...(speakerId ? { speakerId } : {}),
    })
  }

  // Keep segment boundaries monotonic so the audio player never seeks backwards.
  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i]
    const next = segments[i + 1]
    if (current && next && current.end > next.start) current.end = next.start
  }

  const last = segments[segments.length - 1]
  return {
    text: segments.map((s) => s.text).join('\n'),
    segments,
    durationSeconds: last ? Math.ceil(last.end) : 0,
    speakerNames: Object.fromEntries(speakerLabels),
    isMock: false,
  }
}

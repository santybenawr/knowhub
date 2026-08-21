import { CHUNKING } from '@/config/search'
import { estimateTokens, normalizeWhitespace } from '@/lib/text'

/**
 * §54/§183 — Chunking.
 *
 * Text is split on natural boundaries (paragraph, then sentence) rather than at
 * a fixed offset, so a chunk rarely ends mid-thought. Chunks overlap slightly
 * so an answer that straddles a boundary is still retrievable.
 */

export type TextChunk = {
  index: number
  content: string
  tokenCount: number
  pageNumber?: number
  sectionTitle?: string
}

export function chunkText(
  input: string,
  options: { targetChars?: number; overlapChars?: number; minChars?: number } = {},
): string[] {
  const target = options.targetChars ?? CHUNKING.targetChars
  const overlap = options.overlapChars ?? CHUNKING.overlapChars
  const min = options.minChars ?? CHUNKING.minChars

  const text = normalizeWhitespace(input)
  if (text.length === 0) return []
  if (text.length <= target) return [text]

  const units = splitIntoUnits(text, target)
  const chunks: string[] = []
  let current = ''

  for (const unit of units) {
    if (current.length === 0) {
      current = unit
      continue
    }
    if (current.length + unit.length + 1 <= target) {
      current = `${current}\n${unit}`
      continue
    }
    chunks.push(current)
    current = overlap > 0 ? `${tailOf(current, overlap)}\n${unit}` : unit
  }

  if (current.trim().length > 0) {
    // Fold a stray tail into the previous chunk instead of emitting a fragment.
    if (current.trim().length < min && chunks.length > 0) {
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]}\n${current}`
    } else {
      chunks.push(current)
    }
  }

  return chunks.map((c) => c.trim()).filter((c) => c.length > 0)
}

/** Splits into paragraphs, then sentences, then hard-wraps anything still oversized. */
function splitIntoUnits(text: string, target: number): string[] {
  const units: string[] = []
  for (const paragraph of text.split(/\n{2,}/)) {
    const trimmed = paragraph.trim()
    if (trimmed.length === 0) continue
    if (trimmed.length <= target) {
      units.push(trimmed)
      continue
    }
    for (const sentence of trimmed.split(/(?<=[.!?])\s+/)) {
      const s = sentence.trim()
      if (s.length === 0) continue
      if (s.length <= target) {
        units.push(s)
        continue
      }
      for (let i = 0; i < s.length; i += target) units.push(s.slice(i, i + target))
    }
  }
  return units
}

function tailOf(text: string, chars: number): string {
  if (text.length <= chars) return text
  const tail = text.slice(-chars)
  const boundary = tail.search(/\s/)
  return boundary === -1 ? tail : tail.slice(boundary + 1)
}

/** Chunks a paginated document, keeping the page number for citations (§112). */
export function chunkPages(pages: Array<{ pageNumber: number; text: string }>): TextChunk[] {
  const chunks: TextChunk[] = []
  for (const page of pages) {
    for (const content of chunkText(page.text)) {
      chunks.push({
        index: chunks.length,
        content,
        tokenCount: estimateTokens(content),
        pageNumber: page.pageNumber,
      })
    }
  }
  return chunks
}

export function chunkPlainText(text: string): TextChunk[] {
  return chunkText(text).map((content, index) => ({
    index,
    content,
    tokenCount: estimateTokens(content),
  }))
}

/* ------------------------------------------------------------------------ */
/* Meeting chunking                                                         */
/* ------------------------------------------------------------------------ */

export type TranscriptSegmentInput = {
  id: string
  startSeconds: number
  endSeconds: number
  text: string
  speakerKey?: string | null
}

export type MeetingChunkDraft = {
  index: number
  content: string
  startSeconds: number
  endSeconds: number
  speakerKeys: string[]
  segmentIds: string[]
  tokenCount: number
}

/**
 * §31/§183 — Meeting chunks group consecutive segments up to a size budget and
 * carry their real time span, speakers and segment ids. Timestamps are never
 * lost in chunking: a citation resolves back to the exact moment in the audio.
 */
export function chunkTranscriptSegments(
  segments: TranscriptSegmentInput[],
  options: { targetChars?: number; speakerLabels?: Map<string, string> } = {},
): MeetingChunkDraft[] {
  const target = options.targetChars ?? CHUNKING.meetingTargetChars
  const labels = options.speakerLabels
  const chunks: MeetingChunkDraft[] = []

  let buffer: TranscriptSegmentInput[] = []
  let bufferLength = 0

  const flush = () => {
    if (buffer.length === 0) return
    const first = buffer[0]
    const last = buffer[buffer.length - 1]
    if (!first || !last) return

    const content = buffer
      .map((s) => {
        const label = s.speakerKey ? (labels?.get(s.speakerKey) ?? s.speakerKey) : null
        return label ? `${label}: ${s.text}` : s.text
      })
      .join('\n')

    chunks.push({
      index: chunks.length,
      content,
      startSeconds: first.startSeconds,
      endSeconds: last.endSeconds,
      speakerKeys: [...new Set(buffer.map((s) => s.speakerKey).filter((k): k is string => Boolean(k)))],
      segmentIds: buffer.map((s) => s.id),
      tokenCount: estimateTokens(content),
    })
    buffer = []
    bufferLength = 0
  }

  for (const segment of segments) {
    const length = segment.text.length + 1
    if (bufferLength > 0 && bufferLength + length > target) flush()
    buffer.push(segment)
    bufferLength += length
  }
  flush()

  return chunks
}

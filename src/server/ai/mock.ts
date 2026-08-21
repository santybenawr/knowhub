import { getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { estimateTokens, truncate } from '@/lib/text'
import { meetingAnalysisSchema, type MeetingAnalysis } from '@/validations/meeting-analysis'
import { localEmbedding, tokenize } from './local-embedding'
import { EVIDENCE_CLOSE, EVIDENCE_OPEN, NO_EVIDENCE_ANSWER } from './prompts'
import type {
  AIProvider,
  EmbeddingResult,
  GenerateTextInput,
  GenerateTextResult,
  StructuredInput,
  StructuredResult,
} from './types'

/**
 * §78/§90 — Development and test provider. Never calls an external service.
 *
 * It is deterministic and *extractive*: answers are assembled from the evidence
 * actually retrieved, and meeting insights come from rule-based extraction over
 * the real transcript. Nothing is fabricated — so the Ask, Search and Meeting
 * flows can be exercised end to end (and asserted in CI) without credentials,
 * while the answers stay traceable to real sources.
 */
export class MockAIProvider implements AIProvider {
  readonly name = 'mock'
  readonly isMock = true
  readonly supportsStreaming = true
  private readonly dimensions: number

  constructor(dimensions = getServerEnv().EMBEDDING_DIMENSIONS) {
    this.dimensions = dimensions
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const text = this.answer(input)
    return {
      text,
      usage: { inputTokens: countInputTokens(input), outputTokens: estimateTokens(text) },
      model: 'mock-extractive-v1',
    }
  }

  async *streamText(input: GenerateTextInput): AsyncIterable<string> {
    const { text } = await this.generateText(input)
    // Emit word by word so the streaming UI path is genuinely exercised.
    for (const word of text.split(/(\s+)/)) {
      if (word) yield word
    }
  }

  async generateStructuredOutput<T>(input: StructuredInput<T>): Promise<StructuredResult<T>> {
    const prompt = input.messages.map((m) => m.content).join('\n\n')
    let payload: unknown

    switch (input.schemaName) {
      case 'MeetingAnalysis':
        payload = analyseTranscript(extractEvidence(prompt)[0]?.content ?? '')
        break
      case 'DocumentSummary': {
        const body = extractEvidence(prompt)[0]?.content ?? ''
        payload = {
          summary: extractiveSummary(body, 4),
          topics: topTerms(body, 6),
        }
        break
      }
      case 'ConversationTitle':
        payload = { title: truncate(lastUserMessage(input.messages), 48) }
        break
      default:
        throw providerError(
          `MockAIProvider no implementa el esquema "${input.schemaName}". Configura un proveedor de IA real.`,
        )
    }

    const parsed = input.schema.safeParse(payload)
    if (!parsed.success) {
      throw providerError(`MockAIProvider produjo un resultado inválido para ${input.schemaName}.`)
    }
    return {
      data: parsed.data,
      usage: { inputTokens: estimateTokens(prompt), outputTokens: 200 },
      model: 'mock-extractive-v1',
    }
  }

  async createEmbedding(texts: string[]): Promise<EmbeddingResult> {
    return {
      embeddings: texts.map((t) => localEmbedding(t, this.dimensions)),
      usage: { inputTokens: texts.reduce((n, t) => n + estimateTokens(t), 0), outputTokens: 0 },
      model: 'mock-hashing-v1',
      dimensions: this.dimensions,
    }
  }

  /** Extractive QA over the fenced evidence in the prompt. */
  private answer(input: GenerateTextInput): string {
    const prompt = input.messages.map((m) => m.content).join('\n\n')
    const evidence = extractEvidence(prompt)
    const question = extractQuestion(prompt)

    if (evidence.length === 0) return NO_EVIDENCE_ANSWER

    const queryTerms = new Set(tokenize(question))
    const scored = evidence
      .flatMap((item) =>
        splitSentences(item.content).map((sentence) => ({
          sentence,
          index: item.index,
          score: overlapScore(sentence, queryTerms),
        })),
      )
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)

    // Retrieval already judged these chunks relevant. When the question shares
    // no vocabulary with them (a paraphrase, a synonym), quoting the top-ranked
    // evidence is the honest answer — claiming "no information" here would
    // contradict the layer that just found some.
    const candidates =
      scored.length > 0
        ? scored
        : evidence
            .flatMap((item) =>
              splitSentences(item.content)
                .slice(0, 2)
                .map((sentence) => ({ sentence, index: item.index, score: 0.01 })),
            )
            .slice(0, 3)

    if (candidates.length === 0) return NO_EVIDENCE_ANSWER

    const scoredCandidates = candidates
    const chosen: typeof scoredCandidates = []
    const usedIndexes = new Set<number>()
    for (const candidate of scoredCandidates) {
      if (chosen.length >= 3) break
      if (usedIndexes.has(candidate.index) && chosen.length >= 2) continue
      chosen.push(candidate)
      usedIndexes.add(candidate.index)
    }

    const body = chosen.map((c) => `${c.sentence.trim()} [${c.index}]`).join(' ')
    return `${body}`
  }
}

function countInputTokens(input: GenerateTextInput): number {
  return input.messages.reduce((n, m) => n + estimateTokens(m.content), 0)
}

function lastUserMessage(messages: GenerateTextInput['messages']): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message?.role === 'user') return message.content
  }
  return ''
}

export function extractEvidence(prompt: string): Array<{ index: number; content: string }> {
  const results: Array<{ index: number; content: string }> = []
  for (let index = 1; index <= 50; index++) {
    const open = prompt.indexOf(EVIDENCE_OPEN(index))
    if (open === -1) continue
    const close = prompt.indexOf(EVIDENCE_CLOSE(index), open)
    if (close === -1) continue
    results.push({
      index,
      content: prompt.slice(open + EVIDENCE_OPEN(index).length, close).trim(),
    })
  }
  return results
}

function extractQuestion(prompt: string): string {
  const marker = 'PREGUNTA DEL USUARIO:'
  const start = prompt.indexOf(marker)
  if (start === -1) return prompt.slice(0, 300)
  const rest = prompt.slice(start + marker.length)
  const end = rest.indexOf('\n\n')
  return (end === -1 ? rest : rest.slice(0, end)).trim()
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?¿?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15)
}

function overlapScore(sentence: string, queryTerms: Set<string>): number {
  if (queryTerms.size === 0) return 0
  const tokens = tokenize(sentence)
  if (tokens.length === 0) return 0
  let hits = 0
  for (const token of new Set(tokens)) if (queryTerms.has(token)) hits++
  return hits / Math.sqrt(tokens.length)
}

function extractiveSummary(text: string, maxSentences: number): string {
  const sentences = splitSentences(text)
  if (sentences.length === 0) return truncate(text, 300)
  const terms = new Set(topTerms(text, 12))
  return sentences
    .map((sentence, i) => ({ sentence, i, score: overlapScore(sentence, terms) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i)
    .map((s) => s.sentence)
    .join(' ')
}

function topTerms(text: string, limit: number): string[] {
  const counts = new Map<string, number>()
  for (const token of tokenize(text)) counts.set(token, (counts.get(token) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term)
}

/* ------------------------------------------------------------------------ */
/* Rule-based meeting analysis                                              */
/* ------------------------------------------------------------------------ */

type ParsedLine = { segmentId: string; speaker: string | null; text: string }

/**
 * Word boundaries are written as Unicode lookarounds rather than `\b`.
 *
 * JavaScript's `\b` is defined over [A-Za-z0-9_] only, so `contactaré\b` never
 * matches: the position after "é" sits between two non-word characters. Every
 * pattern here has to survive Spanish accents, so the boundary is explicit.
 */
const BOUNDARY_START = '(?<![\\p{L}\\p{N}])'
const BOUNDARY_END = '(?![\\p{L}\\p{N}])'
const word = (body: string) => new RegExp(`${BOUNDARY_START}(?:${body})${BOUNDARY_END}`, 'iu')

const DECISION_PATTERNS = [
  /(?<![\p{L}\p{N}])entonces\s+(?:vamos a|seleccion|elegi|nos quedamos|escogemos)/iu,
  word('decidimos|decidido|queda decidido|acordamos|acordado'),
  word('vamos a (?:seleccionar|elegir|trabajar con|contratar|usar|implementar)'),
  word('seleccionar(?:emos|íamos|iamos)?'),
  word('nos quedamos con'),
  word("we (?:will|'ll) go with|we decided|let's go with"),
]

const ACTION_PATTERNS = [
  word(
    'yo\\s+(?:me encargo|contacto|contactar[ée]|env[ií]o|env[ií]ar[ée]|preparo|preparar[ée]|reviso|revisar[ée]|hago|har[ée])',
  ),
  word('contactar[ée]|enviar[ée]|revisar[ée]|preparar[ée]|coordinar[ée]|agendar[ée]'),
  word('tenemos que|hay que|necesitamos|debemos|queda pendiente|pendiente de'),
  word("i will|i'll|we need to|we have to"),
]

/** Longest alternatives first, so "pasado mañana" is not truncated to "mañana". */
const DATE_PATTERNS = word(
  'pasado ma[ñn]ana|ma[ñn]ana|hoy|la pr[oó]xima semana|' +
    'el pr[oó]ximo (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|mes)|' +
    'el \\d{1,2} de [\\p{L}]+|\\d{1,2}/\\d{1,2}(?:/\\d{2,4})?|' +
    'el (?:lunes|martes|mi[eé]rcoles|jueves|viernes)',
)

/** First-person commitment: only then is the speaker named as responsible. */
const FIRST_PERSON_COMMITMENT = word(
  "yo|i (?:will|'ll)|me encargo|contactar[ée]|enviar[ée]|revisar[ée]|preparar[ée]",
)

/**
 * Deterministic extraction used by the mock provider. Conservative by design:
 * when a responsible party or a date is not stated it stays null, exactly as
 * §93 requires of the real model.
 */
export function analyseTranscript(transcript: string): MeetingAnalysis {
  const lines = parseTranscript(transcript)
  const speakers = [...new Set(lines.map((l) => l.speaker).filter((s): s is string => Boolean(s)))]

  const decisions = lines
    .filter((l) => DECISION_PATTERNS.some((p) => p.test(l.text)))
    .map((l) => ({ text: l.text, evidenceSegmentIds: [l.segmentId] }))

  const actionItems = lines
    .filter((l) => ACTION_PATTERNS.some((p) => p.test(l.text)))
    .map((l) => {
      const dateMatch = l.text.match(DATE_PATTERNS)
      // Only claim a responsible party when the speaker commits in first person.
      const firstPerson = FIRST_PERSON_COMMITMENT.test(l.text)
      return {
        task: l.text,
        responsible: firstPerson ? l.speaker : null,
        deadline: dateMatch?.[0] ?? null,
        evidenceSegmentIds: [l.segmentId],
      }
    })

  const openQuestions = lines
    .filter((l) => /\?/.test(l.text))
    .map((l) => ({ text: l.text, evidenceSegmentIds: [l.segmentId] }))

  const importantDates = lines
    .filter((l) => DATE_PATTERNS.test(l.text))
    .map((l) => ({
      text: l.text,
      date: null,
      evidenceSegmentIds: [l.segmentId],
    }))

  const body = lines.map((l) => l.text).join(' ')
  const keyPoints = lines
    .map((l) => ({ line: l, score: l.text.length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ line }) => ({ text: line.text, evidenceSegmentIds: [line.segmentId] }))

  return meetingAnalysisSchema.parse({
    summary: extractiveSummary(body, 4),
    topics: topTerms(body, 6),
    participants: speakers,
    decisions: dedupeBy(decisions, (d) => d.text).slice(0, 10),
    actionItems: dedupeBy(actionItems, (a) => a.task).slice(0, 10),
    keyPoints,
    openQuestions: dedupeBy(openQuestions, (q) => q.text).slice(0, 6),
    importantDates: dedupeBy(importantDates, (d) => d.text).slice(0, 6),
    // Derived from the transcript's own vocabulary rather than a generic list:
    // a suggested question the library cannot answer is worse than none.
    suggestedQuestions: topTerms(body, 3).map((term) => `¿Qué se dijo sobre ${term}?`),
  })
}

/** Transcript lines arrive as "[segmentId] mm:ss Hablante: texto". */
function parseTranscript(transcript: string): ParsedLine[] {
  const lines: ParsedLine[] = []
  for (const raw of transcript.split('\n')) {
    const match = raw.match(/^\[([^\]]+)\]\s*(?:[\d:.]+)?\s*(?:([^:]{1,60}):)?\s*(.*)$/)
    if (!match) continue
    const [, segmentId, speaker, text] = match
    if (!segmentId || !text || text.trim().length === 0) continue
    lines.push({
      segmentId: segmentId.trim(),
      speaker: speaker?.trim() || null,
      text: text.trim(),
    })
  }
  return lines
}

function dedupeBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const k = key(item).toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(item)
  }
  return out
}


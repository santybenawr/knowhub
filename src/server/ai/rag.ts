import { SEARCH_CONFIG } from '@/config/search'
import { formatTimestamp, formatDateEs } from '@/lib/time'
import { truncate } from '@/lib/text'
import { search, type ResourceKind, type SearchFilters, type SearchHit } from '@/server/search'
import { buildRagMessages, NO_EVIDENCE_ANSWER, type EvidenceItem } from './prompts'
import { getAIProvider } from './index'
import type { AiMessage } from './types'

/**
 * §110–§114 — Retrieval-augmented generation.
 *
 * Retrieve → filter by permission-scoped workspace → deduplicate → apply a
 * score threshold → diversify across resources → build a bounded context →
 * generate → attach citations that point at the exact evidence.
 */

export type Citation = {
  index: number
  kind: ResourceKind
  chunkId: string
  resourceId: string
  resourceTitle: string
  /** Deep link that opens the evidence (§113). */
  href: string
  /** Human label shown under the answer, e.g. "Reunión Omega · 20 ago 2026 · 23:41". */
  label: string
  excerpt: string
  score: number
  pageNumber: number | null
  startSeconds: number | null
  endSeconds: number | null
}

export type RagScope =
  | { type: 'workspace' }
  | { type: 'project'; projectId: string; projectName: string }
  | { type: 'document'; documentId: string; title: string }
  | { type: 'note'; noteId: string; title: string }
  | { type: 'meeting'; meetingId: string; title: string }

export type RetrievedContext = {
  citations: Citation[]
  evidence: EvidenceItem[]
  messages: AiMessage[]
  hasEvidence: boolean
}

export function scopeToFilters(scope: RagScope): SearchFilters {
  switch (scope.type) {
    case 'project':
      return { projectId: scope.projectId }
    case 'document':
      return { kinds: ['document'], documentId: scope.documentId }
    case 'note':
      return { kinds: ['note'], noteId: scope.noteId }
    case 'meeting':
      return { kinds: ['meeting'], meetingId: scope.meetingId }
    default:
      return {}
  }
}

export function scopeLabel(scope: RagScope): string {
  switch (scope.type) {
    case 'project':
      return `Proyecto "${scope.projectName}"`
    case 'document':
      return `Documento "${scope.title}"`
    case 'note':
      return `Nota "${scope.title}"`
    case 'meeting':
      return `Reunión "${scope.title}"`
    default:
      return 'Todo el conocimiento del workspace'
  }
}

export function citationHref(hit: SearchHit): string {
  switch (hit.kind) {
    case 'meeting':
      // §83 — deep link seeks the player to the cited moment.
      return `/meetings/${hit.resourceId}?t=${Math.floor(hit.startSeconds ?? 0)}`
    case 'document':
      return `/documents/${hit.resourceId}?chunk=${hit.chunkId}`
    default:
      return `/notes/${hit.resourceId}`
  }
}

export function citationLabel(hit: SearchHit): string {
  const date = formatDateEs(hit.resourceDate)
  switch (hit.kind) {
    case 'meeting':
      return `${hit.resourceTitle} · ${date} · ${formatTimestamp(hit.startSeconds ?? 0)}`
    case 'document':
      return hit.pageNumber
        ? `${hit.resourceTitle} · Página ${hit.pageNumber}`
        : `${hit.resourceTitle}`
    default:
      return `${hit.resourceTitle} · ${date}`
  }
}

/**
 * §111 — Context budget. Never hand the whole library to the model: cap the
 * number of chunks, the size of each, the total, and how many may come from one
 * resource so a single long meeting cannot crowd out everything else.
 */
export function selectContext(hits: SearchHit[]): SearchHit[] {
  const { maxChunks, maxCharsPerChunk, maxContextChars, scoreThreshold, maxChunksPerResource } =
    SEARCH_CONFIG.rag

  const perResource = new Map<string, number>()
  const seenContent = new Set<string>()
  const selected: SearchHit[] = []
  let totalChars = 0

  for (const hit of hits) {
    if (selected.length >= maxChunks) break
    if (hit.score < scoreThreshold) continue

    const used = perResource.get(hit.resourceId) ?? 0
    if (used >= maxChunksPerResource) continue

    // Deduplicate near-identical chunks (overlapping windows, re-uploads).
    const fingerprint = hit.content.slice(0, 160).toLowerCase().replace(/\s+/g, ' ')
    if (seenContent.has(fingerprint)) continue

    const content = truncate(hit.content, maxCharsPerChunk)
    if (totalChars + content.length > maxContextChars) continue

    seenContent.add(fingerprint)
    perResource.set(hit.resourceId, used + 1)
    totalChars += content.length
    selected.push({ ...hit, content })
  }

  return selected
}

export async function retrieveContext(input: {
  workspaceId: string
  question: string
  scope: RagScope
  history?: AiMessage[]
}): Promise<RetrievedContext> {
  const hits = await search({
    workspaceId: input.workspaceId,
    query: input.question,
    filters: scopeToFilters(input.scope),
    limit: SEARCH_CONFIG.candidatesPerArm,
  })

  const selected = selectContext(hits)

  const citations: Citation[] = selected.map((hit, i) => ({
    index: i + 1,
    kind: hit.kind,
    chunkId: hit.chunkId,
    resourceId: hit.resourceId,
    resourceTitle: hit.resourceTitle,
    href: citationHref(hit),
    label: citationLabel(hit),
    excerpt: hit.excerpt,
    score: hit.score,
    pageNumber: hit.pageNumber,
    startSeconds: hit.startSeconds,
    endSeconds: hit.endSeconds,
  }))

  const evidence: EvidenceItem[] = selected.map((hit, i) => ({
    index: i + 1,
    label: citationLabel(hit),
    content: hit.content,
  }))

  return {
    citations,
    evidence,
    hasEvidence: selected.length > 0,
    messages: buildRagMessages({
      question: input.question,
      evidence,
      scopeLabel: scopeLabel(input.scope),
      ...(input.history ? { history: input.history } : {}),
    }),
  }
}

/** Non-streaming answer, used by tests and by non-streaming callers. */
export async function answerQuestion(input: {
  workspaceId: string
  question: string
  scope: RagScope
  history?: AiMessage[]
}): Promise<{ answer: string; citations: Citation[]; usedEvidence: boolean }> {
  const context = await retrieveContext(input)
  if (!context.hasEvidence) {
    // §114 — never fall back to the model's own knowledge.
    return { answer: NO_EVIDENCE_ANSWER, citations: [], usedEvidence: false }
  }

  const { text } = await getAIProvider().generateText({ messages: context.messages, temperature: 0.1 })
  const answer = text.trim() || NO_EVIDENCE_ANSWER
  return {
    answer,
    citations: keepCitedOnly(answer, context.citations),
    usedEvidence: true,
  }
}

/**
 * Only surface sources the answer actually referenced. Listing every retrieved
 * chunk would make the citation list look authoritative when half of it went
 * unused. If the model cited nothing, keep the full set so the user can still
 * check the reasoning.
 */
export function keepCitedOnly(answer: string, citations: Citation[]): Citation[] {
  const referenced = new Set<number>()
  for (const match of answer.matchAll(/\[(\d{1,2})\]/g)) {
    const n = Number(match[1])
    if (Number.isFinite(n)) referenced.add(n)
  }
  if (referenced.size === 0) return citations
  const kept = citations.filter((c) => referenced.has(c.index))
  return kept.length > 0 ? kept : citations
}

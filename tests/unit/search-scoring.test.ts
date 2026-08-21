import { describe, expect, it } from 'vitest'
import { SEARCH_CONFIG } from '@/config/search'
import { selectContext, citationHref, citationLabel, keepCitedOnly } from '@/server/ai/rag'
import type { SearchHit } from '@/server/search/types'

function hit(overrides: Partial<SearchHit> & { chunkId: string }): SearchHit {
  return {
    kind: 'meeting',
    resourceId: 'meeting-1',
    resourceTitle: 'Reunión Proyecto Omega',
    content: 'Contenido del fragmento con suficiente longitud para ser útil.',
    excerpt: 'Contenido del fragmento',
    score: 0.5,
    keywordScore: 0.5,
    semanticScore: 0.5,
    projectId: null,
    projectName: null,
    resourceDate: '2026-08-20T12:00:00.000Z',
    pageNumber: null,
    startSeconds: 1421,
    endSeconds: 1455,
    speakerKeys: [],
    ...overrides,
  }
}

/** §105 — The hybrid weights are a product decision, pinned here. */
describe('hybrid weights', () => {
  it('splits 70/30 in favour of semantic retrieval and sums to 1', () => {
    expect(SEARCH_CONFIG.semanticWeight).toBe(0.7)
    expect(SEARCH_CONFIG.keywordWeight).toBe(0.3)
    expect(SEARCH_CONFIG.semanticWeight + SEARCH_CONFIG.keywordWeight).toBeCloseTo(1)
  })
})

/** §111 — Context budget. */
describe('selectContext', () => {
  it('drops anything below the relevance threshold', () => {
    const selected = selectContext([
      hit({ chunkId: 'a', score: 0.9 }),
      hit({ chunkId: 'b', score: SEARCH_CONFIG.rag.scoreThreshold / 2 }),
    ])
    expect(selected.map((h) => h.chunkId)).toEqual(['a'])
  })

  it('caps how many chunks one resource can contribute', () => {
    const many = Array.from({ length: 10 }, (_, i) =>
      hit({ chunkId: `c${i}`, content: `Fragmento distinto número ${i} con contenido propio.`, score: 0.9 - i * 0.01 }),
    )
    const selected = selectContext(many)
    expect(selected.length).toBe(SEARCH_CONFIG.rag.maxChunksPerResource)
  })

  it('leaves room for other resources when one is dominant', () => {
    const dominant = Array.from({ length: 8 }, (_, i) =>
      hit({ chunkId: `a${i}`, content: `Fragmento A número ${i}.`, score: 0.9 }),
    )
    const other = hit({
      chunkId: 'b0',
      resourceId: 'doc-1',
      kind: 'document',
      content: 'Un fragmento de otro recurso completamente distinto.',
      score: 0.5,
    })
    const selected = selectContext([...dominant, other])
    expect(selected.some((h) => h.resourceId === 'doc-1')).toBe(true)
  })

  it('deduplicates near-identical chunks from overlapping windows', () => {
    const repeated = 'Exactamente el mismo contenido repetido en dos fragmentos distintos.'
    const selected = selectContext([
      hit({ chunkId: 'a', content: repeated, score: 0.9 }),
      hit({ chunkId: 'b', resourceId: 'meeting-2', content: repeated, score: 0.8 }),
    ])
    expect(selected).toHaveLength(1)
  })

  it('never exceeds the chunk ceiling', () => {
    const many = Array.from({ length: 40 }, (_, i) =>
      hit({ chunkId: `c${i}`, resourceId: `r${i}`, content: `Fragmento único ${i} con su propio contenido.`, score: 0.9 }),
    )
    expect(selectContext(many).length).toBeLessThanOrEqual(SEARCH_CONFIG.rag.maxChunks)
  })

  it('truncates an oversized chunk instead of dropping it', () => {
    const long = 'palabra '.repeat(2000)
    const [selected] = selectContext([hit({ chunkId: 'a', content: long, score: 0.9 })])
    expect(selected?.content.length).toBeLessThanOrEqual(SEARCH_CONFIG.rag.maxCharsPerChunk)
  })
})

/** §113/§182 — Citations point at real evidence. */
describe('citation links', () => {
  it('deep-links a meeting to the second the chunk starts', () => {
    expect(citationHref(hit({ chunkId: 'a' }))).toBe('/meetings/meeting-1?t=1421')
  })

  it('links a document to its cited excerpt', () => {
    expect(citationHref(hit({ chunkId: 'chunk-9', kind: 'document', resourceId: 'doc-1' }))).toBe(
      '/documents/doc-1?chunk=chunk-9',
    )
  })

  it('labels a meeting with its date and timestamp', () => {
    expect(citationLabel(hit({ chunkId: 'a' }))).toBe('Reunión Proyecto Omega · 20 ago 2026 · 23:41')
  })

  it('labels a document page when there is one', () => {
    expect(
      citationLabel(hit({ chunkId: 'a', kind: 'document', resourceTitle: 'Principios', pageNumber: 12 })),
    ).toBe('Principios · Página 12')
  })
})

describe('keepCitedOnly', () => {
  const citations = [
    { index: 1, kind: 'meeting' as const, chunkId: 'a', resourceId: 'm1', resourceTitle: 'A', href: '', label: '', excerpt: '', score: 1, pageNumber: null, startSeconds: 0, endSeconds: 1 },
    { index: 2, kind: 'meeting' as const, chunkId: 'b', resourceId: 'm1', resourceTitle: 'B', href: '', label: '', excerpt: '', score: 1, pageNumber: null, startSeconds: 0, endSeconds: 1 },
  ]

  it('keeps only the sources the answer actually referenced', () => {
    expect(keepCitedOnly('Se decidió el proveedor B. [2]', citations).map((c) => c.index)).toEqual([2])
  })

  it('keeps every source when the answer cited none, so the user can still check', () => {
    expect(keepCitedOnly('Una respuesta sin marcadores.', citations)).toHaveLength(2)
  })

  it('ignores citation numbers that do not exist', () => {
    expect(keepCitedOnly('Respuesta [9]', citations)).toHaveLength(2)
  })
})

import { describe, expect, it } from 'vitest'
import { cosineSimilarity, localEmbedding, normalize, tokenize } from '@/server/ai/local-embedding'

const DIMENSIONS = 256

/**
 * The local embedding is a real vector space, not a placeholder: these
 * assertions are about retrieval behaviour, which is what the search layer
 * depends on when no external model is configured.
 */
describe('local embedding', () => {
  it('is deterministic for the same input', () => {
    const a = localEmbedding('Seleccionamos el proveedor B', DIMENSIONS)
    const b = localEmbedding('Seleccionamos el proveedor B', DIMENSIONS)
    expect(a).toEqual(b)
  })

  it('produces unit vectors of the requested width', () => {
    const vector = localEmbedding('Un texto cualquiera sobre administración', DIMENSIONS)
    expect(vector).toHaveLength(DIMENSIONS)
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('puts related text closer than unrelated text', () => {
    const query = localEmbedding('¿qué proveedor elegimos?', DIMENSIONS)
    const related = localEmbedding('Entonces vamos a seleccionar el proveedor B', DIMENSIONS)
    const unrelated = localEmbedding('La receta lleva harina, huevos y azúcar', DIMENSIONS)

    expect(cosineSimilarity(query, related)).toBeGreaterThan(cosineSimilarity(query, unrelated))
  })

  it('returns a zero vector for text with no usable tokens', () => {
    const vector = localEmbedding('a de la', DIMENSIONS)
    expect(vector.every((v) => v === 0)).toBe(true)
  })
})

describe('tokenize', () => {
  it('strips accents, lowercases and drops stopwords', () => {
    // "el" and "está" are stopwords; "está" also loses its accent first.
    expect(tokenize('El Proveedor está Seleccionado')).toEqual(['proveedor', 'seleccionado'])
  })
})

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors and 0 for orthogonal ones', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1)
    expect(cosineSimilarity([1, 0, 0], [0, 1, 0])).toBeCloseTo(0)
  })

  it('returns 0 rather than NaN when a vector is empty', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })
})

describe('normalize', () => {
  it('leaves a zero vector alone instead of dividing by zero', () => {
    expect(normalize([0, 0, 0])).toEqual([0, 0, 0])
  })
})

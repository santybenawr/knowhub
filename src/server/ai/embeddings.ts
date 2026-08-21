import { getAIProvider } from '@/server/ai'
import { EMBEDDING_DIMENSIONS } from '@/server/db/schema'
import { providerError } from '@/lib/errors'

/**
 * Embedding helpers.
 *
 * The vector column width is fixed at migration time, so a provider returning a
 * different width is a configuration error worth failing loudly on rather than
 * silently truncating.
 */
const MAX_BATCH = 64

export async function embedTexts(texts: string[]): Promise<{ vectors: number[][]; tokens: number }> {
  if (texts.length === 0) return { vectors: [], tokens: 0 }
  const provider = getAIProvider()
  const vectors: number[][] = []
  let tokens = 0

  for (let i = 0; i < texts.length; i += MAX_BATCH) {
    const batch = texts.slice(i, i + MAX_BATCH)
    const result = await provider.createEmbedding(batch)
    for (const vector of result.embeddings) {
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw providerError(
          `El modelo de embeddings devolvió ${vector.length} dimensiones y el esquema espera ${EMBEDDING_DIMENSIONS}. Ajusta EMBEDDING_MODEL/EMBEDDING_DIMENSIONS y regenera los embeddings.`,
        )
      }
      vectors.push(vector)
    }
    tokens += result.usage.inputTokens
  }

  return { vectors, tokens }
}

export async function embedQuery(query: string): Promise<number[]> {
  const { vectors } = await embedTexts([query])
  const vector = vectors[0]
  if (!vector) throw providerError('No pudimos generar el embedding de la consulta.')
  return vector
}

/** pgvector literal form, used when passing a vector as a query parameter. */
export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((v) => (Number.isFinite(v) ? v.toFixed(6) : '0')).join(',')}]`
}

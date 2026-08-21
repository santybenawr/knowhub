import { createHash } from 'node:crypto'

/**
 * Deterministic local embedding (feature hashing).
 *
 * This is not a stand-in for a neural embedding: it is a real, if simple,
 * vector space built from hashed unigrams and bigrams. Similar wording lands
 * close together, which makes semantic retrieval genuinely exercisable in
 * development and CI without calling an external service — and makes test runs
 * reproducible. Production uses the configured embedding model.
 */

const STOPWORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para', 'con',
  'no', 'una', 'su', 'al', 'lo', 'como', 'mas', 'pero', 'sus', 'le', 'ya', 'o', 'este', 'si',
  'porque', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'tambien', 'me', 'hasta', 'hay',
  'donde', 'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was',
  'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'new', 'now', 'old',
])

const NGRAM_SIZE = 4

export function tokenize(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9ñ]+/)
    .filter((t) => t.length >= 3 && t.length <= 32 && !STOPWORDS.has(t))
}

/**
 * Weights are deliberately non-negative.
 *
 * Signed feature hashing (the textbook variant) cancels collision bias, but it
 * also means a short query can score *negative* against a document that
 * genuinely contains its terms: with only a handful of query features, the
 * unshared ones land in buckets whose sign happens to oppose the document's and
 * swamp the real overlap. Non-negative weights make shared terms always help,
 * which is the property retrieval actually needs here.
 */
function hashIndex(token: string, dimensions: number): number {
  const digest = createHash('sha1').update(token).digest()
  return digest.readUInt32BE(0) % dimensions
}

export function localEmbedding(text: string, dimensions: number): number[] {
  const vector = new Array<number>(dimensions).fill(0)
  const tokens = tokenize(text)
  if (tokens.length === 0) return vector

  const counts = new Map<string, number>()
  const bump = (feature: string, weight: number) => {
    counts.set(feature, (counts.get(feature) ?? 0) + weight)
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (!token) continue
    bump(token, 1)

    const next = tokens[i + 1]
    // Bigrams keep "proveedor b" closer to itself than to a stray "proveedor".
    if (next) bump(`${token}_${next}`, 0.6)

    // Character 4-grams give the space some morphology: "decisiones" and
    // "decidimos" share "deci", so a question phrased with a different
    // inflection than the source still lands nearby. Weighted well below whole
    // tokens so they inform the ranking without dominating it.
    for (let j = 0; j + NGRAM_SIZE <= token.length; j++) {
      bump(`#${token.slice(j, j + NGRAM_SIZE)}`, 0.25)
    }
  }

  for (const [feature, count] of counts) {
    const index = hashIndex(feature, dimensions)
    // Sub-linear term frequency: a word repeated 20 times is not 20x the signal.
    //
    // `log1p` rather than `1 + log`: features carry fractional weights (bigrams
    // 0.6, character n-grams 0.25), and `1 + log(0.25)` is negative, which would
    // put negative components back into a vector that is meant to be
    // non-negative — and let a document score below zero against a query that
    // genuinely contains its terms.
    vector[index] = (vector[index] ?? 0) + Math.log1p(count)
  }

  return normalize(vector)
}

export function normalize(vector: number[]): number[] {
  let sum = 0
  for (const v of vector) sum += v * v
  const norm = Math.sqrt(sum)
  if (norm === 0) return vector
  return vector.map((v) => v / norm)
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < length; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    dot += x * y
    normA += x * x
    normB += y * y
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

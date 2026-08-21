/**
 * §105/§111 — One home for retrieval tuning. Never hardcode these inline.
 */
export const SEARCH_CONFIG = {
  /** Hybrid blend: semantic 70% / keyword 30%. */
  semanticWeight: 0.7,
  keywordWeight: 0.3,

  /**
   * Postgres text-search configuration. 'spanish' removes stopwords and stems,
   * which is what makes a natural-language question match the text that answers
   * it. Must stay in sync with the generated `search_vector` columns — changing
   * it requires a migration (see 0003_spanish_fts).
   */
  textSearchConfig: 'spanish',

  /** Candidates pulled from each retrieval arm before fusion. */
  candidatesPerArm: 40,

  /** Final results returned to the UI. */
  maxResults: 20,

  /** RAG context budget (§111). */
  rag: {
    maxChunks: 12,
    maxCharsPerChunk: 1400,
    maxContextChars: 14_000,
    /** Below this fused score a chunk is not worth citing. */
    scoreThreshold: 0.02,
    /** Diversity: at most this many chunks from a single resource. */
    maxChunksPerResource: 4,
  },

  /** Related knowledge (§119). */
  related: {
    limit: 5,
    minSimilarity: 0.15,
  },
} as const

/** Chunking (§54/§183). */
export const CHUNKING = {
  targetChars: 1200,
  overlapChars: 150,
  minChars: 120,
  /** Meeting chunks group transcript segments up to this many characters. */
  meetingTargetChars: 900,
} as const

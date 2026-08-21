import { SEARCH_CONFIG } from '@/config/search'
import { buildExcerpt } from '@/lib/text'
import { rawQuery } from '@/server/db/client'
import { embedQuery, toVectorLiteral } from '@/server/ai/embeddings'
import type { ResourceKind, SearchFilters, SearchHit, SearchOptions } from './types'

export * from './types'

type RawRow = {
  kind: ResourceKind
  chunk_id: string
  resource_id: string
  resource_title: string
  content: string
  project_id: string | null
  project_name: string | null
  resource_date: string
  page_number: number | null
  start_seconds: number | null
  end_seconds: number | null
  speaker_keys: unknown
  raw_score: string | number
}

/**
 * §104/§105/§106 — Hybrid search.
 *
 * Two independent arms (Postgres full-text and pgvector cosine) each fetch
 * their own candidates; scores are min-max normalised per arm and then fused
 * with the weights in `SEARCH_CONFIG`. Normalising per arm matters because
 * `ts_rank_cd` and cosine similarity are on entirely different scales — adding
 * them raw would let one arm dominate by accident.
 *
 * Every query is scoped by `workspace_id` inside the SQL itself, so a bug in a
 * caller cannot widen the search beyond the tenant (§16).
 */
export async function search(options: SearchOptions): Promise<SearchHit[]> {
  const query = options.query.trim()
  if (query.length === 0) return []

  const limit = options.limit ?? SEARCH_CONFIG.maxResults
  const filters = options.filters ?? {}

  const [keywordRows, semanticRows] = await Promise.all([
    keywordArm(options.workspaceId, query, filters),
    semanticArm(options.workspaceId, query, filters).catch((err) => {
      // Embeddings may be unavailable (provider down, or not yet generated).
      // Keyword-only results are better than an error page (§129).
      console.error('[knowhub] semantic arm failed, falling back to keyword only', err)
      return [] as RawRow[]
    }),
  ])

  // The two arms are normalised differently on purpose (see below).
  const keyword = normalizeKeywordScores(keywordRows)
  const semantic = normalizeSemanticScores(semanticRows)

  const merged = new Map<string, SearchHit>()

  const upsert = (row: RawRow, keywordScore: number, semanticScore: number) => {
    const existing = merged.get(row.chunk_id)
    if (existing) {
      existing.keywordScore = Math.max(existing.keywordScore, keywordScore)
      existing.semanticScore = Math.max(existing.semanticScore, semanticScore)
      existing.score =
        existing.keywordScore * SEARCH_CONFIG.keywordWeight +
        existing.semanticScore * SEARCH_CONFIG.semanticWeight
      return
    }
    merged.set(row.chunk_id, {
      kind: row.kind,
      chunkId: row.chunk_id,
      resourceId: row.resource_id,
      resourceTitle: row.resource_title,
      content: row.content,
      excerpt: buildExcerpt(row.content, query),
      keywordScore,
      semanticScore,
      score: keywordScore * SEARCH_CONFIG.keywordWeight + semanticScore * SEARCH_CONFIG.semanticWeight,
      projectId: row.project_id,
      projectName: row.project_name,
      resourceDate: row.resource_date,
      pageNumber: row.page_number,
      startSeconds: row.start_seconds === null ? null : Number(row.start_seconds),
      endSeconds: row.end_seconds === null ? null : Number(row.end_seconds),
      speakerKeys: parseSpeakerKeys(row.speaker_keys),
    })
  }

  keywordRows.forEach((row, i) => upsert(row, keyword[i] ?? 0, 0))
  semanticRows.forEach((row, i) => upsert(row, 0, semantic[i] ?? 0))

  return [...merged.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}

function parseSpeakerKeys(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string')
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : []
    } catch {
      return []
    }
  }
  return []
}

/**
 * `ts_rank_cd` has no absolute meaning — its magnitude depends on the query and
 * the document length — so keyword scores are scaled against the best hit in
 * this result set. The top match becomes 1 and the rest are relative to it.
 *
 * Min-max would be wrong here: with two candidates it always forces the weaker
 * one to exactly 0, discarding a real match.
 */
function normalizeKeywordScores(rows: RawRow[]): number[] {
  if (rows.length === 0) return []
  const scores = rows.map((r) => Number(r.raw_score) || 0)
  const max = Math.max(...scores)
  if (max <= 0) return scores.map(() => 0)
  return scores.map((s) => Math.max(0, s / max))
}

/**
 * Cosine similarity is already an absolute measure in [-1,1], so it is used
 * directly rather than rescaled. That keeps the score comparable across
 * queries, and means a lone weak match stays weak instead of being normalised
 * up to 1 — which is what a per-set rescale would do to a single candidate.
 */
function normalizeSemanticScores(rows: RawRow[]): number[] {
  return rows.map((r) => Math.min(1, Math.max(0, Number(r.raw_score) || 0)))
}

/* ------------------------------------------------------------------------ */
/* SQL                                                                      */
/* ------------------------------------------------------------------------ */

type SourceSql = { kind: ResourceKind; sql: (scoreExpr: string, extraWhere: string) => string }

/**
 * One SELECT per source, unioned. They project an identical column list so the
 * fusion layer stays source-agnostic.
 */
function sourceQueries(filters: SearchFilters): SourceSql[] {
  const kinds = filters.kinds ?? ['document', 'note', 'meeting']
  const sources: SourceSql[] = []

  if (kinds.includes('document')) {
    sources.push({
      kind: 'document',
      sql: (scoreExpr, extraWhere) => `
        SELECT 'document' AS kind, c.id AS chunk_id, d.id AS resource_id, d.title AS resource_title,
               c.content, d.project_id, p.name AS project_name, d.created_at AS resource_date,
               c.page_number, NULL::double precision AS start_seconds, NULL::double precision AS end_seconds,
               '[]'::jsonb AS speaker_keys, ${scoreExpr} AS raw_score
        FROM document_chunks c
        JOIN documents d ON d.id = c.document_id
        LEFT JOIN projects p ON p.id = d.project_id
        WHERE c.workspace_id = $1 AND d.deleted_at IS NULL ${extraWhere}`,
    })
  }

  if (kinds.includes('note')) {
    sources.push({
      kind: 'note',
      sql: (scoreExpr, extraWhere) => `
        SELECT 'note' AS kind, c.id AS chunk_id, n.id AS resource_id,
               CASE WHEN n.title = '' THEN 'Nota sin título' ELSE n.title END AS resource_title,
               c.content, n.project_id, p.name AS project_name, n.updated_at AS resource_date,
               NULL::integer AS page_number, NULL::double precision AS start_seconds,
               NULL::double precision AS end_seconds, '[]'::jsonb AS speaker_keys, ${scoreExpr} AS raw_score
        FROM note_chunks c
        JOIN notes n ON n.id = c.note_id
        LEFT JOIN projects p ON p.id = n.project_id
        WHERE c.workspace_id = $1 AND n.deleted_at IS NULL ${extraWhere}`,
    })
  }

  if (kinds.includes('meeting')) {
    sources.push({
      kind: 'meeting',
      sql: (scoreExpr, extraWhere) => `
        SELECT 'meeting' AS kind, c.id AS chunk_id, m.id AS resource_id, m.title AS resource_title,
               c.content, m.project_id, p.name AS project_name, m.meeting_date AS resource_date,
               NULL::integer AS page_number, c.start_seconds, c.end_seconds,
               c.speaker_keys, ${scoreExpr} AS raw_score
        FROM meeting_chunks c
        JOIN meetings m ON m.id = c.meeting_id
        LEFT JOIN projects p ON p.id = m.project_id
        WHERE c.workspace_id = $1 AND m.deleted_at IS NULL ${extraWhere}`,
    })
  }

  return sources
}

/** Resource-scoped filters, expressed per source so ids cannot cross tables. */
function extraWhereFor(kind: ResourceKind, filters: SearchFilters, params: unknown[]): string {
  const clauses: string[] = []
  const alias = kind === 'document' ? 'd' : kind === 'note' ? 'n' : 'm'

  if (filters.projectId) {
    params.push(filters.projectId)
    clauses.push(`AND ${alias}.project_id = $${params.length}`)
  }
  if (kind === 'meeting' && filters.meetingId) {
    params.push(filters.meetingId)
    clauses.push(`AND m.id = $${params.length}`)
  }
  if (kind === 'document' && filters.documentId) {
    params.push(filters.documentId)
    clauses.push(`AND d.id = $${params.length}`)
  }
  if (kind === 'note' && filters.noteId) {
    params.push(filters.noteId)
    clauses.push(`AND n.id = $${params.length}`)
  }
  return clauses.join(' ')
}

async function keywordArm(
  workspaceId: string,
  query: string,
  filters: SearchFilters,
): Promise<RawRow[]> {
  const params: unknown[] = [workspaceId, query]
  const config = SEARCH_CONFIG.textSearchConfig

  /*
   * The query is turned into an OR of its lexemes rather than passed through
   * `plainto_tsquery`, which ANDs every term. People ask questions —
   * "¿Qué decidimos sobre el proveedor?" — and a single word that does not
   * appear in the text (here, "decidimos") would make the whole AND fail and
   * return nothing, even though "proveedor" is right there.
   *
   * Postgres does the lexing, so the terms are the same ones stored in
   * `search_vector`. `ts_rank_cd` then does the discriminating: a chunk that
   * only matched a filler word ranks near zero and falls under the threshold.
   */
  const tsquery = `(
    SELECT to_tsquery('${config}', nullif(string_agg(lexeme, ' | '), ''))
    FROM unnest(to_tsvector('${config}', $2))
  )`
  const scoreExpr = `ts_rank_cd(c.search_vector, ${tsquery})`

  const parts = sourceQueries(filters).map(
    (source) => `${source.sql(scoreExpr, extraWhereFor(source.kind, filters, params))}
        AND c.search_vector @@ ${tsquery}`,
  )
  if (parts.length === 0) return []

  const sql = `${parts.join('\nUNION ALL\n')}
    ORDER BY raw_score DESC
    LIMIT ${SEARCH_CONFIG.candidatesPerArm}`

  return rawQuery<RawRow>(sql, params)
}

async function semanticArm(
  workspaceId: string,
  query: string,
  filters: SearchFilters,
): Promise<RawRow[]> {
  const vector = await embedQuery(query)
  const params: unknown[] = [workspaceId, toVectorLiteral(vector)]
  // Cosine distance -> similarity, so higher is better in both arms.
  const scoreExpr = `(1 - (c.embedding <=> $2::vector))`

  const parts = sourceQueries(filters).map(
    (source) => `${source.sql(scoreExpr, extraWhereFor(source.kind, filters, params))}
        AND c.embedding IS NOT NULL`,
  )
  if (parts.length === 0) return []

  const sql = `${parts.join('\nUNION ALL\n')}
    ORDER BY raw_score DESC
    LIMIT ${SEARCH_CONFIG.candidatesPerArm}`

  return rawQuery<RawRow>(sql, params)
}

/**
 * §119 — Related knowledge: nearest neighbours of a resource's own chunks,
 * excluding the resource itself.
 */
export async function findRelated(input: {
  workspaceId: string
  kind: ResourceKind
  resourceId: string
  limit?: number
}): Promise<Array<{ kind: ResourceKind; resourceId: string; resourceTitle: string; similarity: number }>> {
  const table =
    input.kind === 'document' ? 'document_chunks' : input.kind === 'note' ? 'note_chunks' : 'meeting_chunks'
  const fk = input.kind === 'document' ? 'document_id' : input.kind === 'note' ? 'note_id' : 'meeting_id'

  const centroid = await rawQuery<{ centroid: string | null }>(
    `SELECT avg(embedding)::text AS centroid FROM ${table}
     WHERE workspace_id = $1 AND ${fk} = $2 AND embedding IS NOT NULL`,
    [input.workspaceId, input.resourceId],
  )
  const vector = centroid[0]?.centroid
  if (!vector) return []

  const rows = await rawQuery<{
    kind: ResourceKind
    resource_id: string
    resource_title: string
    similarity: number
  }>(
    `WITH candidates AS (
       SELECT 'document'::text AS kind, d.id AS resource_id, d.title AS resource_title,
              1 - (c.embedding <=> $2::vector) AS similarity
       FROM document_chunks c JOIN documents d ON d.id = c.document_id
       WHERE c.workspace_id = $1 AND d.deleted_at IS NULL AND c.embedding IS NOT NULL
         AND NOT ($3 = 'document' AND d.id = $4)
       UNION ALL
       SELECT 'note', n.id, CASE WHEN n.title = '' THEN 'Nota sin título' ELSE n.title END,
              1 - (c.embedding <=> $2::vector)
       FROM note_chunks c JOIN notes n ON n.id = c.note_id
       WHERE c.workspace_id = $1 AND n.deleted_at IS NULL AND c.embedding IS NOT NULL
         AND NOT ($3 = 'note' AND n.id = $4)
       UNION ALL
       SELECT 'meeting', m.id, m.title, 1 - (c.embedding <=> $2::vector)
       FROM meeting_chunks c JOIN meetings m ON m.id = c.meeting_id
       WHERE c.workspace_id = $1 AND m.deleted_at IS NULL AND c.embedding IS NOT NULL
         AND NOT ($3 = 'meeting' AND m.id = $4)
     )
     SELECT kind, resource_id, resource_title, max(similarity) AS similarity
     FROM candidates
     GROUP BY kind, resource_id, resource_title
     HAVING max(similarity) >= $5
     ORDER BY similarity DESC
     LIMIT $6`,
    [
      input.workspaceId,
      vector,
      input.kind,
      input.resourceId,
      SEARCH_CONFIG.related.minSimilarity,
      input.limit ?? SEARCH_CONFIG.related.limit,
    ],
  )

  return rows.map((r) => ({
    kind: r.kind,
    resourceId: r.resource_id,
    resourceTitle: r.resource_title,
    similarity: Number(r.similarity),
  }))
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requirePageContext } from '@/server/auth/guard'
import { search } from '@/server/search'
import { listProjects } from '@/server/projects'
import { trackEvent } from '@/server/analytics'
import { enforceRateLimit } from '@/server/rate-limit'
import { SearchForm } from '@/features/search/search-form'
import { SearchResults } from '@/features/search/search-results'
import type { ResourceKind } from '@/server/search/types'
import { toUserMessage } from '@/lib/errors'
import { isAiMocked } from '@/server/ai'

export const metadata: Metadata = { title: 'Buscar' }

const VALID_KINDS: ResourceKind[] = ['document', 'note', 'meeting']

/** §104/§107/§108/§109 — Hybrid search results, grouped by resource type. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; kind?: string | string[]; project?: string | string[] }>
}) {
  const { access } = await requirePageContext('search:use')
  const params = await searchParams

  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? '' : value ?? ''
  const query = first(params.q).trim()
  const kindParam = first(params.kind)
  const kind = VALID_KINDS.includes(kindParam as ResourceKind) ? (kindParam as ResourceKind) : null
  const projectId = first(params.project) || null

  const projects = await listProjects(access.workspaceId)
  if (projectId && !projects.some(project => project.id === projectId)) notFound()

  let results: Awaited<ReturnType<typeof search>> = []
  let error: string | null = query.length > 500 ? 'Usa una búsqueda de hasta 500 caracteres.' : null
  if (query.length > 0 && !error) {
    try {
      await enforceRateLimit('search', access.userId)
      results = await search({
        workspaceId: access.workspaceId,
        query,
        filters: {
          ...(kind ? { kinds: [kind] } : {}),
          projectId,
        },
      })
      await trackEvent('search_performed', access, { results: results.length, hasFilter: Boolean(kind) })
    } catch (err) {
      error = toUserMessage(err)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Buscar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {isAiMocked()
            ? 'Busca palabras y frases de tus documentos, notas y transcripciones.'
            : 'Combinamos búsqueda por palabras y búsqueda semántica sobre toda tu biblioteca.'}
        </p>
      </div>

      <SearchForm
        key={`${query}:${kind ?? ''}:${projectId ?? ''}`}
        initialQuery={query}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedKind={kind}
        selectedProject={projectId}
      />

      {error ? <p role="alert" className="text-sm text-record">{error}</p> : <SearchResults query={query} results={results} localMode={isAiMocked()} />}
    </div>
  )
}

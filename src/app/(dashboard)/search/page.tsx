import type { Metadata } from 'next'
import { requirePageContext } from '@/server/auth/guard'
import { search } from '@/server/search'
import { listProjects } from '@/server/projects'
import { trackEvent } from '@/server/analytics'
import { enforceRateLimit } from '@/server/rate-limit'
import { SearchForm } from '@/features/search/search-form'
import { SearchResults } from '@/features/search/search-results'
import type { ResourceKind } from '@/server/search/types'

export const metadata: Metadata = { title: 'Buscar' }

const VALID_KINDS: ResourceKind[] = ['document', 'note', 'meeting']

/** §104/§107/§108/§109 — Hybrid search results, grouped by resource type. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; project?: string }>
}) {
  const { access } = await requirePageContext('search:use')
  const params = await searchParams

  const query = (params.q ?? '').trim()
  const kind = VALID_KINDS.includes(params.kind as ResourceKind) ? (params.kind as ResourceKind) : null
  const projectId = params.project ?? null

  const projects = await listProjects(access.workspaceId)

  let results: Awaited<ReturnType<typeof search>> = []
  if (query.length > 0) {
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
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Buscar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Combinamos búsqueda por palabras y búsqueda semántica sobre toda tu biblioteca.
        </p>
      </div>

      <SearchForm
        initialQuery={query}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        selectedKind={kind}
        selectedProject={projectId}
      />

      <SearchResults query={query} results={results} />
    </div>
  )
}

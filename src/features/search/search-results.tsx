import Link from 'next/link'
import { Search } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'
import { ResourceIcon, resourceHref } from '@/components/shared/resource-card'
import { formatDateEs, formatTimestamp } from '@/lib/time'
import type { SearchHit } from '@/server/search/types'

/** §107/§108/§109 — Each result shows where the match came from. */
export function SearchResults({ query, results }: { query: string; results: SearchHit[] }) {
  if (query.length === 0) {
    return (
      <EmptyState
        icon={<Search className="size-6" />}
        title="Busca por palabras o por significado."
        description="KnowHub combina coincidencias exactas con similitud semántica, así que también encuentra lo que recuerdas a medias."
      />
    )
  }

  if (results.length === 0) {
    return (
      <EmptyState
        title={`Sin resultados para “${query}”.`}
        description="Prueba con otras palabras, o revisa si el recurso ya terminó de procesarse."
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
      </p>

      <ul className="space-y-2.5">
        {results.map((hit) => (
          <li key={hit.chunkId}>
            <Link
              href={
                hit.kind === 'meeting'
                  ? `/meetings/${hit.resourceId}?t=${Math.floor(hit.startSeconds ?? 0)}`
                  : resourceHref(hit.kind, hit.resourceId)
              }
              className="block rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-border-strong"
            >
              <div className="flex items-center gap-2 text-xs text-ink-faint">
                <ResourceIcon kind={hit.kind} />
                <span className="truncate font-medium text-ink">{hit.resourceTitle}</span>
                {hit.kind === 'meeting' && hit.startSeconds !== null ? (
                  <span className="shrink-0 font-mono text-brand">
                    {formatTimestamp(hit.startSeconds)}
                    {hit.endSeconds !== null ? `–${formatTimestamp(hit.endSeconds)}` : ''}
                  </span>
                ) : null}
                {hit.kind === 'document' && hit.pageNumber ? (
                  <span className="shrink-0">Página {hit.pageNumber}</span>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-relaxed text-ink-muted">“{hit.excerpt}”</p>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-ink-faint">
                <span>{formatDateEs(hit.resourceDate)}</span>
                {hit.projectName ? <span>{hit.projectName}</span> : null}
                <span title="Relevancia combinada de búsqueda por palabras y semántica">
                  Relevancia {(hit.score * 100).toFixed(0)}%
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

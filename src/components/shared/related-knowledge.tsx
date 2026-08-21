import Link from 'next/link'
import { ResourceIcon, resourceHref } from './resource-card'
import type { ResourceKind } from '@/server/search/types'

/** §119 — Related knowledge, from semantic similarity across the workspace. */
export function RelatedKnowledge({
  items,
}: {
  items: Array<{ kind: ResourceKind; resourceId: string; resourceTitle: string; similarity: number }>
}) {
  if (items.length === 0) return null

  return (
    <section aria-labelledby="relacionado" className="border-t border-border-subtle pt-6">
      <h2 id="relacionado" className="mb-3 text-sm font-semibold text-ink">
        Contenido relacionado
      </h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={`${item.kind}-${item.resourceId}`}>
            <Link
              href={resourceHref(item.kind, item.resourceId)}
              className="flex items-center gap-2.5 rounded-lg border border-border-subtle bg-surface p-3 transition-colors hover:border-border-strong"
            >
              <ResourceIcon kind={item.kind} className="shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.resourceTitle}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * §113 — Extracted text, chunk by chunk.
 *
 * Arriving from a citation highlights and scrolls to the exact excerpt that was
 * cited, which is what makes "ver la fuente" a real check rather than a link to
 * a 40-page file.
 */
export function DocumentContent({
  chunks,
  highlightChunkId,
}: {
  chunks: Array<{ id: string; content: string; pageNumber: number | null }>
  highlightChunkId: string | null
}) {
  const targetRef = React.useRef<HTMLLIElement>(null)

  React.useEffect(() => {
    if (highlightChunkId) targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [highlightChunkId])

  if (chunks.length === 0) {
    return <p className="text-sm text-ink-muted">Todavía no extrajimos texto de este documento.</p>
  }

  return (
    <ol className="space-y-3">
      {chunks.map((chunk) => {
        const highlighted = chunk.id === highlightChunkId
        return (
          <li
            key={chunk.id}
            ref={highlighted ? targetRef : null}
            className={cn(
              'rounded-card border p-4 transition-colors',
              highlighted ? 'border-brand bg-brand-soft' : 'border-border-subtle bg-surface',
            )}
          >
            {chunk.pageNumber ? (
              <p className="mb-1.5 text-xs font-medium text-ink-faint">Página {chunk.pageNumber}</p>
            ) : null}
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-muted">{chunk.content}</p>
          </li>
        )
      })}
    </ol>
  )
}

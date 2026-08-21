'use client'

import Link from 'next/link'
import { FileText, Mic, NotebookPen } from 'lucide-react'
import * as React from 'react'
import { formatTimestamp } from '@/lib/time'
import { cn } from '@/lib/utils'

export type CitationView = {
  index: number
  kind: 'document' | 'note' | 'meeting'
  resourceId: string
  resourceTitle: string
  href: string
  label: string
  excerpt: string
  pageNumber: number | null
  startSeconds: number | null
  endSeconds: number | null
}

const ICONS = { document: FileText, note: NotebookPen, meeting: Mic } as const

/**
 * §112/§113 — Answers render `[n]` as a link to the evidence. For meetings the
 * link carries `?t=`, so clicking a citation opens the player at that second.
 */
export function AnswerWithCitations({
  answer,
  citations,
  onCitationClick,
}: {
  answer: string
  citations: CitationView[]
  onCitationClick?: (citation: CitationView) => void
}) {
  const byIndex = React.useMemo(
    () => new Map(citations.map((citation) => [citation.index, citation])),
    [citations],
  )

  const parts = React.useMemo(() => answer.split(/(\[\d{1,2}\])/g), [answer])

  return (
    <p className="whitespace-pre-wrap leading-relaxed text-ink">
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d{1,2})\]$/)
        if (!match) return <React.Fragment key={i}>{part}</React.Fragment>

        const citation = byIndex.get(Number(match[1]))
        if (!citation) return <React.Fragment key={i}>{part}</React.Fragment>

        const marker = (
          <span className="inline-flex items-center rounded bg-brand-soft px-1 py-0.5 align-baseline font-mono text-[0.7em] font-semibold text-brand-ink">
            {citation.index}
          </span>
        )

        // Inside a meeting page, seeking the existing player beats navigating.
        if (onCitationClick) {
          return (
            <button
              key={i}
              type="button"
              onClick={() => onCitationClick(citation)}
              className="mx-0.5 transition-opacity hover:opacity-80"
              aria-label={`Ver fuente ${citation.index}: ${citation.label}`}
            >
              {marker}
            </button>
          )
        }

        return (
          <Link
            key={i}
            href={citation.href}
            className="mx-0.5 transition-opacity hover:opacity-80"
            aria-label={`Ver fuente ${citation.index}: ${citation.label}`}
          >
            {marker}
          </Link>
        )
      })}
    </p>
  )
}

export function CitationList({
  citations,
  onCitationClick,
  className,
}: {
  citations: CitationView[]
  onCitationClick?: (citation: CitationView) => void
  className?: string
}) {
  if (citations.length === 0) return null

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Fuentes</h4>
      <ul className="space-y-2">
        {citations.map((citation) => {
          const Icon = ICONS[citation.kind]
          const body = (
            <>
              <span className="flex size-5 shrink-0 items-center justify-center rounded bg-brand-soft font-mono text-[10px] font-semibold text-brand-ink">
                {citation.index}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <Icon className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                  <span className="truncate">{citation.resourceTitle}</span>
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  {citation.kind === 'meeting' && citation.startSeconds !== null
                    ? `${formatTimestamp(citation.startSeconds)}${
                        citation.endSeconds !== null ? `–${formatTimestamp(citation.endSeconds)}` : ''
                      }`
                    : citation.pageNumber
                      ? `Página ${citation.pageNumber}`
                      : citation.label}
                </span>
                <span className="mt-1 block line-clamp-2 text-xs italic text-ink-faint">
                  “{citation.excerpt}”
                </span>
              </span>
            </>
          )

          const classes =
            'flex w-full items-start gap-2.5 rounded-lg border border-border-subtle bg-surface p-3 text-left transition-colors hover:border-border-strong'

          return (
            <li key={`${citation.index}-${citation.resourceId}`}>
              {onCitationClick ? (
                <button type="button" onClick={() => onCitationClick(citation)} className={classes}>
                  {body}
                </button>
              ) : (
                <Link href={citation.href} className={classes}>
                  {body}
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

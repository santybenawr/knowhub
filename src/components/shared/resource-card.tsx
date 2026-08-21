import Link from 'next/link'
import { FileText, Mic, NotebookPen } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDateEs, formatDurationHuman } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { ResourceKind } from '@/server/search/types'

const ICONS = { document: FileText, note: NotebookPen, meeting: Mic } as const
const LABELS = { document: 'Documento', note: 'Nota', meeting: 'Reunión' } as const

export type ProcessingState = 'pending' | 'processing' | 'completed' | 'failed'

export function ResourceIcon({ kind, className }: { kind: ResourceKind; className?: string }) {
  const Icon = ICONS[kind]
  return <Icon className={cn('size-4', className)} aria-hidden />
}

export function resourceHref(kind: ResourceKind, id: string): string {
  return kind === 'meeting' ? `/meetings/${id}` : kind === 'document' ? `/documents/${id}` : `/notes/${id}`
}

/** §51/§192 — One card shape for every resource type; the badges say what differs. */
export function ResourceCard({
  kind,
  id,
  title,
  date,
  projectName,
  durationSeconds,
  status,
  excerpt,
  speakerCount,
}: {
  kind: ResourceKind
  id: string
  title: string
  date: Date | string
  projectName?: string | null
  durationSeconds?: number | null
  /** Free-form because it spans document, note and meeting state machines. */
  status?: string
  excerpt?: string | null
  speakerCount?: number
}) {
  return (
    <Link
      href={resourceHref(kind, id)}
      className="group flex flex-col gap-2 rounded-card border border-border-subtle bg-surface p-4 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-ink-faint">
          <ResourceIcon kind={kind} />
          <span className="text-xs font-medium uppercase tracking-wide">{LABELS[kind]}</span>
        </div>
        <StatusBadge status={status} />
      </div>

      <h3 className="line-clamp-2 font-medium leading-snug text-ink">{title}</h3>

      {excerpt ? <p className="line-clamp-2 text-sm text-ink-muted">{excerpt}</p> : null}

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-ink-faint">
        <span>{formatDateEs(date)}</span>
        {durationSeconds ? <span>{formatDurationHuman(durationSeconds)}</span> : null}
        {speakerCount ? <span>{speakerCount} hablantes</span> : null}
        {projectName ? <span className="truncate">{projectName}</span> : null}
      </div>
    </Link>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status || status === 'completed' || status === 'ready') return null

  if (status === 'failed') {
    return <Badge tone="record">Falló</Badge>
  }
  if (status === 'recording') {
    return <Badge tone="record">Grabando</Badge>
  }
  if (status === 'processing' || status === 'uploading' || status === 'pending') {
    return <Badge tone="warning">Procesando…</Badge>
  }
  if (status === 'draft') {
    return <Badge tone="outline">Borrador</Badge>
  }
  return null
}

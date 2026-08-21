import { formatBytes } from '@/lib/time'
import type { UsageSummary } from '@/server/usage'
import { cn } from '@/lib/utils'

/** §141 — Usage in the units the user recognises. Never internal token counts. */
export function UsagePanel({ usage }: { usage: UsageSummary }) {
  const rows = [
    { label: 'Documentos', value: usage.documents, max: usage.plan.maxDocuments, format: (n: number) => String(n) },
    {
      label: 'Almacenamiento',
      value: usage.storageBytes,
      max: usage.plan.maxStorageBytes,
      format: formatBytes,
    },
    {
      label: 'Consultas de IA',
      value: usage.aiQueries,
      max: usage.plan.maxAiQueriesPerMonth,
      format: (n: number) => String(n),
    },
    {
      label: 'Minutos de reuniones',
      value: usage.meetingMinutes,
      max: usage.plan.meetingMinutesPerMonth,
      format: (n: number) => `${Math.round(n)} min`,
    },
  ]

  return (
    <aside className="surface-card h-fit p-5" aria-labelledby="uso">
      <div className="flex items-center justify-between">
        <h2 id="uso" className="text-sm font-semibold text-ink">
          Uso este mes
        </h2>
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-ink-muted">
          Plan {usage.plan.label}
        </span>
      </div>

      <dl className="mt-4 space-y-3.5">
        {rows.map((row) => {
          const pct = row.max > 0 ? Math.min(100, (row.value / row.max) * 100) : 0
          return (
            <div key={row.label}>
              <div className="flex items-baseline justify-between text-xs">
                <dt className="text-ink-muted">{row.label}</dt>
                <dd className="font-medium text-ink">
                  {row.format(row.value)}{' '}
                  <span className="font-normal text-ink-faint">/ {row.format(row.max)}</span>
                </dd>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-[width]',
                    pct >= 90 ? 'bg-record' : pct >= 70 ? 'bg-warning' : 'bg-brand',
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </dl>
    </aside>
  )
}

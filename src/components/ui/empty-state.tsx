import type * as React from 'react'
import { cn } from '@/lib/utils'

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-border-strong px-6 py-14 text-center',
        className,
      )}
    >
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <h3 className="max-w-md text-balance text-lg font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="max-w-md text-balance text-sm text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

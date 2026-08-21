import { AlertTriangle, Check, CircleDashed, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StageState = 'pending' | 'processing' | 'completed' | 'failed'

/**
 * §88 — Per-stage progress. Real states only: there is no percentage because
 * the providers do not report one, and inventing a progress bar would be a lie.
 */
export function StageList({
  stages,
  className,
}: {
  stages: Array<{ label: string; state: StageState; detail?: string }>
  className?: string
}) {
  return (
    <ol className={cn('space-y-2.5', className)}>
      {stages.map((stage) => (
        <li key={stage.label} className="flex items-start gap-2.5 text-sm">
          <StageIcon state={stage.state} />
          <div className="min-w-0">
            <span
              className={cn(
                stage.state === 'completed' && 'text-ink',
                stage.state === 'processing' && 'font-medium text-ink',
                stage.state === 'pending' && 'text-ink-faint',
                stage.state === 'failed' && 'text-record',
              )}
            >
              {stage.label}
            </span>
            {stage.detail ? <p className="text-xs text-ink-muted">{stage.detail}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

function StageIcon({ state }: { state: StageState }) {
  const common = 'mt-0.5 size-4 shrink-0'
  switch (state) {
    case 'completed':
      return <Check className={cn(common, 'text-positive')} aria-label="Completado" />
    case 'processing':
      return <Loader2 className={cn(common, 'animate-spin text-brand')} aria-label="En proceso" />
    case 'failed':
      return <AlertTriangle className={cn(common, 'text-record')} aria-label="Falló" />
    default:
      return <CircleDashed className={cn(common, 'text-ink-faint')} aria-label="Pendiente" />
  }
}

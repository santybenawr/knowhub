'use client'

import * as React from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { formatTimestamp } from '@/lib/time'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/lib/action-result'

export type TranscriptSegmentView = {
  id: string
  speakerKey: string | null
  speakerLabel: string
  startSeconds: number
  endSeconds: number
  text: string
}

/**
 * §84/§85 — Transcript.
 *
 * Segment-level sync: the segment containing the playhead is highlighted, which
 * is enough to follow along and avoids the cost and false precision of
 * word-level alignment. Timestamps are buttons that seek the player (§82).
 */
export function TranscriptView({
  segments,
  speakers,
  currentTime,
  onSeek,
  onRenameSpeaker,
  hasAudio = true,
}: {
  segments: TranscriptSegmentView[]
  speakers: Array<{ speakerKey: string; displayName: string }>
  currentTime: number
  onSeek: (seconds: number) => void
  onRenameSpeaker?: (speakerKey: string, displayName: string) => Promise<ActionResult<undefined>>
  hasAudio?: boolean
}) {
  const activeId = React.useMemo(() => {
    const active = segments.find((s) => currentTime >= s.startSeconds && currentTime < s.endSeconds)
    return active?.id ?? null
  }, [currentTime, segments])

  const activeRef = React.useRef<HTMLLIElement>(null)
  const [autoScroll, setAutoScroll] = React.useState(true)

  React.useEffect(() => {
    if (!autoScroll || !activeId) return
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeId, autoScroll])

  if (segments.length === 0) {
    return <p className="text-sm text-ink-muted">Esta reunión todavía no tiene transcripción.</p>
  }

  return (
    <div className="space-y-4">
      {speakers.length > 0 && onRenameSpeaker ? (
        <SpeakerLegend speakers={speakers} onRename={onRenameSpeaker} />
      ) : null}

      <label className="flex items-center gap-2 text-xs text-ink-muted">
        <input
          type="checkbox"
          checked={autoScroll}
          onChange={(event) => setAutoScroll(event.target.checked)}
          className="size-3.5 accent-[var(--color-brand)]"
        />
        {hasAudio ? 'Seguir el audio automáticamente' : 'Desplazar al fragmento seleccionado'}
      </label>

      <ol className="space-y-1">
        {segments.map((segment) => {
          const isActive = segment.id === activeId
          return (
            <li
              key={segment.id}
              ref={isActive ? activeRef : null}
              className={cn(
                'rounded-lg px-3 py-2.5 transition-colors',
                isActive ? 'bg-brand-soft' : 'hover:bg-surface-muted',
              )}
            >
              <div className="flex items-baseline gap-2.5">
                <button
                  type="button"
                  onClick={() => onSeek(segment.startSeconds)}
                  className="shrink-0 font-mono text-xs tabular-nums text-brand transition-opacity hover:opacity-75"
                  aria-label={`${hasAudio ? 'Reproducir desde' : 'Ver fragmento en'} ${formatTimestamp(segment.startSeconds)}`}
                >
                  {formatTimestamp(segment.startSeconds)}
                </button>
                <span className="truncate text-xs font-semibold text-ink-muted">
                  {segment.speakerLabel}
                </span>
              </div>
              <p className={cn('mt-1 leading-relaxed', isActive ? 'text-ink' : 'text-ink-muted')}>
                {segment.text}
              </p>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** §180 — Rename a speaker; every display updates from the mapping. */
function SpeakerLegend({
  speakers,
  onRename,
}: {
  speakers: Array<{ speakerKey: string; displayName: string }>
  onRename: (speakerKey: string, displayName: string) => Promise<ActionResult<undefined>>
}) {
  const [editing, setEditing] = React.useState<string | null>(null)
  const [value, setValue] = React.useState('')
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Hablantes</span>
      {speakers.map((speaker) => (
        <div key={speaker.speakerKey} className="flex items-center gap-1">
          {editing === speaker.speakerKey ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                setError(null)
                startTransition(async () => {
                  try {
                    const result = await onRename(speaker.speakerKey, value)
                    if (!result.ok) { setError(result.error); return }
                    setEditing(null)
                  } catch {
                    setError('No pudimos guardar el nombre. Revisa tu conexión e inténtalo de nuevo.')
                  }
                })
              }}
              className="flex items-center gap-1"
            >
              <Input
                value={value}
                onChange={(event) => setValue(event.target.value)}
                autoFocus
                className="h-7 w-32 text-xs"
                aria-label={`Nombre para ${speaker.displayName}`}
                maxLength={80}
              />
              <Button type="submit" size="icon" className="size-7" loading={pending} aria-label="Guardar">
                <Check />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                onClick={() => { setEditing(null); setError(null) }}
                disabled={pending}
                aria-label="Cancelar"
              >
                <X />
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditing(speaker.speakerKey)
                setValue(speaker.displayName)
                setError(null)
              }}
              className="group flex items-center gap-1.5 rounded-full border border-border-subtle bg-surface px-2.5 py-1 text-xs text-ink transition-colors hover:border-border-strong"
            >
              {speaker.displayName}
              <Pencil className="size-3 text-ink-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          )}
        </div>
      ))}
      {error ? <p className="w-full text-xs text-record" role="alert">{error}</p> : null}
    </div>
  )
}

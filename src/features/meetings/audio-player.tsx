'use client'

import * as React from 'react'
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatTimestamp } from '@/lib/time'
import { cn } from '@/lib/utils'

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const

export type AudioPlayerHandle = {
  /** §82 — jump to an absolute position, in seconds. */
  seekTo: (seconds: number, autoplay?: boolean) => void
}

/**
 * §74/§124 — Meeting audio player.
 *
 * Plays a signed URL directly, so the browser streams byte ranges instead of
 * downloading the whole file before the first note (§124). Time updates are
 * lifted so the transcript can highlight the active segment (§84).
 */
export const AudioPlayer = React.forwardRef<
  AudioPlayerHandle,
  {
    src: string
    durationHint?: number | null
    startAt?: number | null
    onTimeUpdate?: (seconds: number) => void
    className?: string
  }
>(function AudioPlayer({ src, durationHint, startAt, onTimeUpdate, className }, ref) {
  const audioRef = React.useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = React.useState(false)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [duration, setDuration] = React.useState(durationHint ?? 0)
  const [speed, setSpeed] = React.useState<number>(1)
  const [failed, setFailed] = React.useState(false)
  const appliedStartRef = React.useRef(false)

  React.useImperativeHandle(ref, () => ({
    seekTo: (seconds, autoplay = true) => {
      const audio = audioRef.current
      if (!audio) return
      audio.currentTime = Math.max(0, seconds)
      setCurrentTime(Math.max(0, seconds))
      if (autoplay) void audio.play().catch(() => undefined)
    },
  }))

  // §83 — `?t=` positions the player once metadata is known, not before.
  React.useEffect(() => {
    const audio = audioRef.current
    if (!audio || appliedStartRef.current || startAt == null) return
    const apply = () => {
      audio.currentTime = Math.max(0, startAt)
      setCurrentTime(Math.max(0, startAt))
      appliedStartRef.current = true
    }
    if (audio.readyState >= 1) apply()
    else audio.addEventListener('loadedmetadata', apply, { once: true })
  }, [startAt])

  const skip = (delta: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(audio.duration || Infinity, audio.currentTime + delta))
  }

  const effectiveDuration = duration || durationHint || 0

  if (failed) {
    return (
      <div className={cn('surface-card p-4 text-sm text-ink-muted', className)} role="alert">
        No pudimos cargar el audio. Es posible que el enlace haya expirado; recarga la página.
      </div>
    )
  }

  return (
    <div className={cn('surface-card p-4', className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const value = event.currentTarget.duration
          if (Number.isFinite(value)) setDuration(value)
        }}
        onTimeUpdate={(event) => {
          const value = event.currentTarget.currentTime
          setCurrentTime(value)
          onTimeUpdate?.(value)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setFailed(true)}
      >
        <track kind="captions" />
      </audio>

      <div className="flex items-center gap-3">
        <Button
          size="icon"
          onClick={() => {
            const audio = audioRef.current
            if (!audio) return
            if (audio.paused) void audio.play().catch(() => setFailed(true))
            else audio.pause()
          }}
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {playing ? <Pause /> : <Play />}
        </Button>

        <Button variant="ghost" size="icon" onClick={() => skip(-15)} aria-label="Retroceder 15 segundos">
          <RotateCcw />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => skip(15)} aria-label="Avanzar 15 segundos">
          <RotateCw />
        </Button>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-muted">
            {formatTimestamp(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={effectiveDuration || 1}
            step={0.5}
            value={Math.min(currentTime, effectiveDuration || currentTime)}
            onChange={(event) => {
              const audio = audioRef.current
              if (!audio) return
              const next = Number(event.target.value)
              audio.currentTime = next
              setCurrentTime(next)
            }}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-[var(--color-brand)]"
            aria-label="Posición de la reproducción"
            aria-valuetext={formatTimestamp(currentTime)}
          />
          <span className="shrink-0 font-mono text-xs tabular-nums text-ink-faint">
            {formatTimestamp(effectiveDuration)}
          </span>
        </div>

        <label className="flex shrink-0 items-center gap-1.5">
          <Volume2 className="size-4 text-ink-faint" aria-hidden />
          <span className="sr-only">Velocidad de reproducción</span>
          <select
            value={speed}
            onChange={(event) => {
              const next = Number(event.target.value)
              setSpeed(next)
              if (audioRef.current) audioRef.current.playbackRate = next
            }}
            className="rounded-md border border-border-subtle bg-surface px-1.5 py-1 text-xs text-ink-muted"
          >
            {SPEEDS.map((value) => (
              <option key={value} value={value}>
                {value}×
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
})

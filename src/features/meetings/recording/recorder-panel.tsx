'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Mic, MicOff, Pause, Play, Square, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatDurationClock, formatBytes } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/toast'
import { useClientValue } from '@/hooks/use-client-capability'
import { isRecordingSupported, useRecorder } from './use-recorder'
import { RECORDER_ERROR_MESSAGES } from './recorder-machine'

/**
 * §63/§121 — Recording UI.
 *
 * Mobile-first with large targets. Recording state is announced three ways —
 * label, motion and colour — so it is never conveyed by colour alone.
 */
export function RecorderPanel({
  meetingId,
  meetingTitle,
  onStarted,
}: {
  meetingId: string
  meetingTitle: string
  onStarted: () => void
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [confirmStop, setConfirmStop] = React.useState(false)
  // Assume support on the server; the client snapshot corrects it at hydration
  // without a setState-in-effect cascade.
  const supported = useClientValue(isRecordingSupported, true)

  const upload = React.useCallback(
    async (blob: Blob, durationSeconds: number) => {
      const form = new FormData()
      const extension = blob.type.includes('mp4') ? 'm4a' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      form.append('audio', blob, `${meetingId}.${extension}`)
      form.append('durationSeconds', String(durationSeconds))

      const response = await fetch(`/api/meetings/${meetingId}/audio`, {
        method: 'POST',
        body: form,
      })
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(detail?.error ?? 'No pudimos subir el audio.')
      }
    },
    [meetingId],
  )

  const { context, level, requestPermission, start, pause, resume, stop, reset } = useRecorder({
    onComplete: upload,
  })

  React.useEffect(() => {
    if (context.state === 'completed') {
      notify('Grabación guardada. KnowHub la está procesando.', 'success')
      router.push(`/meetings/${meetingId}`)
    }
  }, [context.state, meetingId, notify, router])

  // §194 — never leave a dead button: offer the paths that do work.
  if (!supported) {
    return (
      <div className="surface-card space-y-3 p-6">
        <div className="flex items-start gap-3">
          <MicOff className="mt-0.5 size-5 shrink-0 text-record" aria-hidden />
          <div>
            <h2 className="font-semibold text-ink">
              Tu navegador no permite grabar directamente desde KnowHub.
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Puedes subir una grabación hecha con otra aplicación o importar una transcripción.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const recording = context.state === 'recording'
  const paused = context.state === 'paused'
  const busy = context.state === 'stopping' || context.state === 'uploading'

  return (
    <div className="surface-card p-6">
      <p className="text-sm text-ink-muted">{meetingTitle}</p>

      <div className="mt-5 flex flex-col items-center gap-5 text-center">
        <RecordingIndicator state={context.state} level={level} />

        <p
          className="font-mono text-4xl font-semibold tabular-nums text-ink sm:text-5xl"
          aria-label="Tiempo grabado"
          role="timer"
        >
          {formatDurationClock(context.elapsedSeconds)}
        </p>

        <p className="text-sm text-ink-muted" aria-live="polite">
          {stateLabel(context.state)}
          {context.capturedBytes > 0 && !busy ? ` · ${formatBytes(context.capturedBytes)}` : ''}
        </p>

        {context.error ? (
          <div
            className="flex w-full items-start gap-2 rounded-lg border border-record/40 bg-record-soft p-3 text-left text-sm text-ink"
            role="alert"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-record" aria-hidden />
            <span>{context.error.message || RECORDER_ERROR_MESSAGES[context.error.code]}</span>
          </div>
        ) : null}

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          {context.state === 'idle' || context.state === 'error' ? (
            <Button size="xl" variant="record" onClick={() => void requestPermission()} className="w-full sm:w-auto">
              <Mic /> {context.state === 'error' ? 'Reintentar' : 'Permitir micrófono'}
            </Button>
          ) : null}

          {context.state === 'requesting_permission' ? (
            <Button size="xl" loading disabled className="w-full sm:w-auto">
              Solicitando acceso...
            </Button>
          ) : null}

          {context.state === 'ready' ? (
            <Button
              size="xl"
              variant="record"
              onClick={() => {
                start()
                onStarted()
              }}
              className="w-full sm:w-auto"
            >
              <Mic /> Iniciar grabación
            </Button>
          ) : null}

          {recording || paused ? (
            <>
              <Button
                size="xl"
                variant="secondary"
                onClick={() => (paused ? resume() : pause())}
                className="w-full sm:w-auto"
              >
                {paused ? <Play /> : <Pause />} {paused ? 'Reanudar' : 'Pausar'}
              </Button>
              <Button
                size="xl"
                variant="record"
                onClick={() => setConfirmStop(true)}
                className="w-full sm:w-auto"
              >
                <Square /> Finalizar
              </Button>
            </>
          ) : null}

          {busy ? (
            <Button size="xl" loading disabled className="w-full sm:w-auto">
              {context.state === 'uploading' ? (
                <>
                  <Upload /> Subiendo audio...
                </>
              ) : (
                'Cerrando grabación...'
              )}
            </Button>
          ) : null}
        </div>

        {context.state === 'error' && context.chunkCount > 0 ? (
          <Button variant="ghost" size="sm" onClick={reset}>
            Empezar de nuevo
          </Button>
        ) : null}
      </div>

      {/* §69 — Be honest about what a web app can guarantee on mobile. */}
      {recording || paused ? (
        <p className="mt-6 rounded-lg bg-surface-muted p-3 text-center text-xs text-ink-muted">
          Mantén KnowHub abierto mientras grabas. Si bloqueas la pantalla o cambias de aplicación, el
          navegador puede suspender la captura.
        </p>
      ) : null}

      {/* §187 — one small confirmation so a mistap does not end the meeting. */}
      <Dialog open={confirmStop} onOpenChange={setConfirmStop}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Finalizar la reunión?</DialogTitle>
            <DialogDescription>
              Guardaremos el audio y empezaremos a transcribirlo. No podrás continuar esta grabación.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmStop(false)}>
              Seguir grabando
            </Button>
            <Button
              variant="record"
              onClick={() => {
                setConfirmStop(false)
                void stop()
              }}
            >
              Finalizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function RecordingIndicator({ state, level }: { state: string; level: number }) {
  const active = state === 'recording'
  const paused = state === 'paused'

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={cn(
          'relative flex size-24 items-center justify-center rounded-full transition-colors',
          active ? 'bg-record-soft' : paused ? 'bg-warning-soft' : 'bg-surface-muted',
        )}
      >
        {active ? (
          <span
            className="absolute inset-0 rounded-full border-2 border-record/40"
            style={{ transform: `scale(${1 + Math.min(level, 1) * 0.18})` }}
            aria-hidden
          />
        ) : null}
        <Mic
          className={cn('size-9', active ? 'text-record' : paused ? 'text-warning' : 'text-ink-faint')}
          aria-hidden
        />
      </div>

      {active ? (
        <span className="flex items-center gap-2 rounded-full bg-record px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
          <span className="size-2 rounded-full bg-white animate-record-pulse" aria-hidden />
          Grabando
        </span>
      ) : paused ? (
        <span className="rounded-full bg-warning-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warning">
          En pausa
        </span>
      ) : null}
    </div>
  )
}

function stateLabel(state: string): string {
  switch (state) {
    case 'idle':
      return 'Necesitamos acceso al micrófono para grabar.'
    case 'requesting_permission':
      return 'Esperando tu autorización...'
    case 'ready':
      return 'Micrófono listo.'
    case 'recording':
      return 'Micrófono activo'
    case 'paused':
      return 'Grabación en pausa'
    case 'stopping':
      return 'Cerrando la grabación...'
    case 'uploading':
      return 'Subiendo el audio a tu biblioteca...'
    case 'completed':
      return 'Grabación guardada.'
    default:
      return ''
  }
}

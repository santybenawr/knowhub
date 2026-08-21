'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FileAudio, FileText, Mic, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/lib/action-result'
import { RecorderPanel } from './recording/recorder-panel'

type Mode = 'record' | 'upload' | 'import'

type Props = {
  projects: Array<{ id: string; name: string }>
  hasConsent: boolean
  todayLabel: string
  createMeeting: (input: {
    title?: string
    projectId?: string | null
    meetingDate?: string
    language: 'auto' | 'es' | 'en'
    participants?: string
    source: 'recording' | 'upload' | 'transcript_import'
  }) => Promise<ActionResult<{ meetingId: string }>>
  acceptConsent: () => Promise<ActionResult<undefined>>
  importTranscript: (input: { meetingId: string; transcript: string }) => Promise<ActionResult<undefined>>
  markStarted: (meetingId: string) => Promise<ActionResult<undefined>>
}

/** §57/§58/§59 — Choose a source, fill the short form, then capture. */
export function NewMeetingFlow({
  projects,
  hasConsent,
  todayLabel,
  createMeeting,
  acceptConsent,
  importTranscript,
  markStarted,
}: Props) {
  const router = useRouter()
  const { notify } = useToast()

  const [mode, setMode] = React.useState<Mode>('record')
  const [meetingId, setMeetingId] = React.useState<string | null>(null)
  const [meetingTitle, setMeetingTitle] = React.useState('')
  const [consented, setConsented] = React.useState(hasConsent)
  const [consentChecked, setConsentChecked] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const [form, setForm] = React.useState({
    title: '',
    projectId: '',
    meetingDate: new Date().toISOString().slice(0, 10),
    language: 'auto' as 'auto' | 'es' | 'en',
    participants: '',
  })

  const [transcript, setTranscript] = React.useState('')
  const [audioFile, setAudioFile] = React.useState<File | null>(null)

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createMeeting({
        title: form.title || undefined,
        projectId: form.projectId || null,
        meetingDate: form.meetingDate,
        language: form.language,
        participants: form.participants || undefined,
        source: mode === 'record' ? 'recording' : mode === 'upload' ? 'upload' : 'transcript_import',
      })

      if (!result.ok) {
        setError(result.error)
        return
      }

      const id = result.data.meetingId
      setMeetingId(id)
      setMeetingTitle(form.title || `Reunión ${todayLabel}`)

      if (mode === 'import') {
        const imported = await importTranscript({ meetingId: id, transcript })
        if (!imported.ok) {
          setError(imported.error)
          return
        }
        notify('Transcripción importada. KnowHub la está analizando.', 'success')
        router.push(`/meetings/${id}`)
        return
      }

      if (mode === 'upload' && audioFile) {
        const body = new FormData()
        body.append('audio', audioFile)
        const response = await fetch(`/api/meetings/${id}/audio`, { method: 'POST', body })
        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null
          setError(detail?.error ?? 'No pudimos subir el audio.')
          return
        }
        notify('Audio subido. KnowHub lo está transcribiendo.', 'success')
        router.push(`/meetings/${id}`)
      }
    })
  }

  if (meetingId && mode === 'record') {
    return (
      <RecorderPanel
        meetingId={meetingId}
        meetingTitle={meetingTitle}
        onStarted={() => void markStarted(meetingId)}
      />
    )
  }

  const canSubmit =
    !pending &&
    (mode === 'record' ? consented : mode === 'upload' ? !!audioFile : transcript.trim().length > 20)

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="sr-only">Origen de la reunión</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              { id: 'record', icon: Mic, label: 'Grabar reunión', hint: 'Desde este dispositivo' },
              { id: 'upload', icon: FileAudio, label: 'Subir grabación', hint: 'webm, m4a, mp3, wav' },
              { id: 'import', icon: FileText, label: 'Importar transcripción', hint: 'Texto con tiempos' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              aria-pressed={mode === option.id}
              className={cn(
                'flex flex-col gap-1.5 rounded-card border p-4 text-left transition-colors',
                mode === option.id
                  ? 'border-brand bg-brand-soft'
                  : 'border-border-subtle bg-surface hover:border-border-strong',
                option.id === 'record' && mode !== option.id && 'border-brand/30',
              )}
            >
              <option.icon
                className={cn('size-5', mode === option.id ? 'text-brand' : 'text-ink-faint')}
                aria-hidden
              />
              <span className={cn('font-medium', mode === option.id ? 'text-brand-ink' : 'text-ink')}>
                {option.label}
              </span>
              <span className="text-xs text-ink-muted">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="surface-card space-y-4 p-5">
        <Field label="Título" htmlFor="title" hint={`Opcional. Si lo dejas vacío usaremos "Reunión ${todayLabel}".`}>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Reunión Proyecto Omega"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Proyecto" htmlFor="projectId">
            <Select
              id="projectId"
              value={form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value }))}
            >
              <option value="">Sin proyecto</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Fecha" htmlFor="meetingDate">
            <Input
              id="meetingDate"
              type="date"
              value={form.meetingDate}
              onChange={(e) => setForm((f) => ({ ...f, meetingDate: e.target.value }))}
            />
          </Field>

          <Field label="Idioma" htmlFor="language">
            <Select
              id="language"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as typeof f.language }))}
            >
              <option value="auto">Automático</option>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
            </Select>
          </Field>

          <Field label="Participantes" htmlFor="participants" hint="Opcional, separados por comas.">
            <Input
              id="participants"
              value={form.participants}
              onChange={(e) => setForm((f) => ({ ...f, participants: e.target.value }))}
              placeholder="Santiago, Laura"
            />
          </Field>
        </div>

        {mode === 'upload' ? (
          <Field label="Archivo de audio" htmlFor="audio">
            <Input
              id="audio"
              type="file"
              accept="audio/*,video/mp4,video/webm"
              onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
              className="file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:text-ink"
            />
          </Field>
        ) : null}

        {mode === 'import' ? (
          <Field
            label="Transcripción"
            htmlFor="transcript"
            hint='Formatos reconocidos: "00:23:41 Santiago: texto", "[00:05] Laura: texto" o párrafos con "Nombre: texto".'
          >
            <Textarea
              id="transcript"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              placeholder={'00:00 Santiago: Necesitamos decidir el proveedor.\n00:12 Laura: El proveedor B ofrece mejores condiciones.'}
            />
          </Field>
        ) : null}
      </div>

      {/* §59 — consent notice, shown before the first recording. */}
      {mode === 'record' && !consented ? (
        <div className="surface-card space-y-3 border-warning/40 bg-warning-soft p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
            <p className="text-sm text-ink">
              Antes de grabar, asegúrate de contar con las autorizaciones necesarias de los participantes
              y de utilizar la grabación conforme a las normas aplicables. KnowHub no obtiene esos
              consentimientos por ti.
            </p>
          </div>
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="size-4 accent-[var(--color-brand)]"
            />
            Entiendo y deseo continuar
          </label>
          <Button
            size="sm"
            disabled={!consentChecked}
            onClick={() =>
              startTransition(async () => {
                const result = await acceptConsent()
                if (result.ok) setConsented(true)
                else setError(result.error)
              })
            }
          >
            Continuar
          </Button>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-record/40 bg-record-soft p-3 text-sm text-ink" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button size="lg" onClick={submit} disabled={!canSubmit} loading={pending}>
          {mode === 'record'
            ? 'Preparar grabación'
            : mode === 'upload'
              ? 'Subir y transcribir'
              : 'Importar y analizar'}
        </Button>
      </div>
    </div>
  )
}

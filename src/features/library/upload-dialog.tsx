'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Field, Input, Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { formatBytes } from '@/lib/time'
import { cn } from '@/lib/utils'

const ACCEPTED = '.pdf,.docx,.txt,.md'

/** §52 — Drag and drop, progress, and errors that say what to do next. */
export function UploadDialog({
  projects,
  trigger,
  defaultOpen = false,
  defaultProjectId,
}: {
  projects: Array<{ id: string; name: string }>
  trigger: React.ReactNode
  defaultOpen?: boolean
  defaultProjectId?: string
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [open, setOpen] = React.useState(defaultOpen)
  const [file, setFile] = React.useState<File | null>(null)
  const [title, setTitle] = React.useState('')
  const [projectId, setProjectId] = React.useState(defaultProjectId ?? '')
  const [dragging, setDragging] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = () => {
    setFile(null)
    setTitle('')
    setProgress(0)
    setUploading(false)
    setError(null)
  }

  const upload = () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(0)

    // XHR rather than fetch: it is still the only way to get real upload
    // progress in the browser, and a progress bar that lies is worse than none.
    const body = new FormData()
    body.append('file', file)
    if (title.trim()) body.append('title', title.trim())
    if (projectId) body.append('projectId', projectId)

    const request = new XMLHttpRequest()
    request.open('POST', '/api/documents/upload')

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      setUploading(false)
      if (request.status >= 200 && request.status < 300) {
        notify('Documento subido. KnowHub lo está procesando.', 'success')
        setOpen(false)
        reset()
        router.refresh()
        return
      }
      try {
        const detail = JSON.parse(request.responseText) as { error?: string }
        setError(detail.error ?? 'No pudimos subir el archivo.')
      } catch {
        setError('No pudimos subir el archivo.')
      }
    }

    request.onerror = () => {
      setUploading(false)
      setError('Se interrumpió la conexión durante la subida.')
    }

    request.send(body)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir documento</DialogTitle>
          <DialogDescription>PDF, Word (.docx), Markdown o texto plano.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              const dropped = event.dataTransfer.files?.[0]
              if (dropped) setFile(dropped)
            }}
            className={cn(
              'rounded-card border-2 border-dashed p-6 text-center transition-colors',
              dragging ? 'border-brand bg-brand-soft' : 'border-border-strong',
            )}
          >
            <FileUp className="mx-auto size-6 text-ink-faint" aria-hidden />
            <p className="mt-2 text-sm text-ink">
              {file ? file.name : 'Arrastra un archivo aquí'}
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">
              {file ? formatBytes(file.size) : 'o selecciónalo desde tu equipo'}
            </p>
            <Input
              type="file"
              accept={ACCEPTED}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              aria-label="Seleccionar archivo"
              className="mx-auto mt-3 max-w-xs cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-surface-muted file:px-3 file:py-1.5 file:text-sm file:text-ink"
            />
          </div>

          <Field label="Título" htmlFor="doc-title" hint="Opcional. Por defecto usamos el nombre del archivo.">
            <Input
              id="doc-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Principios de Administración"
            />
          </Field>

          {projects.length > 0 ? (
            <Field label="Proyecto" htmlFor="doc-project">
              <Select
                id="doc-project"
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
              >
                <option value="">Sin proyecto</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          {uploading ? (
            <div>
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" aria-hidden /> Subiendo
                </span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <p
              className="flex items-start gap-2 rounded-lg border border-record/40 bg-record-soft p-3 text-sm text-ink"
              role="alert"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-record" aria-hidden />
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={upload} disabled={!file || uploading} loading={uploading}>
              Subir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

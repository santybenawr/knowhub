'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/action-result'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/**
 * §55 — Note editor with autosave.
 *
 * Saves 1.2s after typing stops. The note row is written on every save; the
 * expensive part (chunking + embedding) goes through the job queue, so typing
 * never triggers a re-index per keystroke.
 */
export function NoteEditor({
  noteId,
  initialTitle,
  initialContent,
  initialProjectId,
  projects,
  onCreate,
  onUpdate,
  onDelete,
}: {
  noteId: string | null
  initialTitle: string
  initialContent: string
  initialProjectId: string | null
  projects: Array<{ id: string; name: string }>
  onCreate?: (input: {
    title: string
    content: string
    projectId?: string | null
  }) => Promise<ActionResult<{ noteId: string }>>
  onUpdate?: (input: {
    noteId: string
    title?: string
    content?: string
    projectId?: string | null
  }) => Promise<ActionResult<undefined>>
  onDelete?: (noteId: string) => Promise<ActionResult<undefined>>
}) {
  const router = useRouter()
  const [title, setTitle] = React.useState(initialTitle)
  const [content, setContent] = React.useState(initialContent)
  const [projectId, setProjectId] = React.useState(initialProjectId ?? '')
  const [state, setState] = React.useState<SaveState>('idle')
  const [error, setError] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const [currentId, setCurrentId] = React.useState(noteId)
  const dirty = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = React.useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    setState('saving')
    setError(null)

    try {
      if (!currentId) {
        if (!onCreate) return
        if (!title.trim() && !content.trim()) {
          setState('idle')
          return
        }
        const result = await onCreate({ title, content, projectId: projectId || null })
        if (!result.ok) {
          setState('error')
          setError(result.error)
          return
        }
        setCurrentId(result.data.noteId)
        // Point the URL at the real note without remounting the editor.
        window.history.replaceState(null, '', `/notes/${result.data.noteId}`)
      } else {
        if (!onUpdate) return
        const result = await onUpdate({
          noteId: currentId,
          title,
          content,
          projectId: projectId || null,
        })
        if (!result.ok) {
          setState('error')
          setError(result.error)
          return
        }
      }
      setState('saved')
    } catch {
      setState('error')
      setError('No pudimos guardar la nota.')
    }
  }, [content, currentId, onCreate, onUpdate, projectId, title])

  React.useEffect(() => {
    if (!dirty.current) return
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void save(), 1200)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [title, content, projectId, save])

  const touch = () => {
    dirty.current = true
    setState('idle')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SaveIndicator state={state} />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              dirty.current = true
              startTransition(async () => {
                await save()
                router.refresh()
              })
            }}
            loading={pending}
          >
            Guardar ahora
          </Button>
          {currentId && onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar nota"
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>

      <Input
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          touch()
        }}
        placeholder="Título de la nota"
        aria-label="Título"
        className="h-auto border-0 bg-transparent px-0 text-2xl font-bold tracking-tight focus:border-0"
      />

      {projects.length > 0 ? (
        <Select
          value={projectId}
          onChange={(event) => {
            setProjectId(event.target.value)
            touch()
          }}
          aria-label="Proyecto"
          className="max-w-xs"
        >
          <option value="">Sin proyecto</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </Select>
      ) : null}

      <Textarea
        value={content}
        onChange={(event) => {
          setContent(event.target.value)
          touch()
        }}
        placeholder="Escribe aquí. KnowHub la indexará para que puedas encontrarla y citarla después."
        aria-label="Contenido"
        className="min-h-[26rem] border-0 bg-transparent px-0 leading-relaxed focus:border-0"
      />

      {error ? (
        <p className="text-sm text-record" role="alert">
          {error}
        </p>
      ) : null}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar esta nota?</DialogTitle>
            <DialogDescription>
              Saldrá de tu biblioteca y de los resultados de búsqueda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (currentId && onDelete) startTransition(() => void onDelete(currentId))
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'saving') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-ink-muted">
        <Loader2 className="size-3 animate-spin" aria-hidden /> Guardando...
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-positive">
        <Check className="size-3" aria-hidden /> Guardado
      </span>
    )
  }
  if (state === 'error') {
    return <span className="text-xs text-record">No se pudo guardar</span>
  }
  return <span className="text-xs text-ink-faint">Se guarda automáticamente</span>
}

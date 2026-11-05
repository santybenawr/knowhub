'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ActionResult } from '@/lib/action-result'
import { registerPendingChanges } from '@/lib/pending-changes'

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
  const { notify } = useToast()
  const [title, setTitle] = React.useState(initialTitle)
  const [content, setContent] = React.useState(initialContent)
  const [projectId, setProjectId] = React.useState(initialProjectId ?? '')
  const [state, setState] = React.useState<SaveState>(noteId ? 'saved' : 'idle')
  const [navigating, setNavigating] = React.useState(false)
  const [leaving, setLeaving] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = React.useState(false)
  const [pending, startTransition] = React.useTransition()

  const [currentId, setCurrentId] = React.useState(noteId)
  const savedId = React.useRef(noteId)
  const createdId = React.useRef<string | null>(null)
  const destinationAfterSave = React.useRef<string | null>(null)
  const pendingFlushes = React.useRef<Array<(saved: boolean) => void>>([])
  const mounted = React.useRef(true)
  const saving = React.useRef(false)
  const latestSave = React.useRef<(() => Promise<void>) | null>(null)
  const dirty = React.useRef(false)
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const save = React.useCallback(async () => {
    if (!dirty.current || saving.current) return
    saving.current = true
    dirty.current = false
    setState('saving')
    setError(null)

    let succeeded = false
    try {
      if (!savedId.current) {
        if (!onCreate) return
        if (!title.trim() && !content.trim()) {
          setState('idle')
          succeeded = true
          return
        }
        const result = await onCreate({ title, content, projectId: projectId || null })
        if (!result.ok) {
          setState('error')
          setError(result.error)
          return
        }
        savedId.current = result.data.noteId
        createdId.current = result.data.noteId
        setCurrentId(result.data.noteId)
      } else {
        if (!onUpdate) return
        const result = await onUpdate({
          noteId: savedId.current,
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
      succeeded = true
      setState(dirty.current ? 'idle' : 'saved')
    } catch {
      setState('error')
      setError('No pudimos guardar la nota.')
    } finally {
      saving.current = false
      if (!succeeded) {
        dirty.current = true
        destinationAfterSave.current = null
        setLeaving(false)
        pendingFlushes.current.splice(0).forEach(resolve => resolve(false))
        if (!mounted.current) {
          notify('La última edición de la nota no se guardó. Comprueba tu conexión y revisa la nota.', 'error')
        }
      }
      // Serialize writes; typing during a request must save the latest state
      // after it completes, and must never create a second note.
      if (succeeded && dirty.current) {
        if (timer.current) clearTimeout(timer.current)
        timer.current = setTimeout(() => void latestSave.current?.(), 0)
      } else if (succeeded && pendingFlushes.current.length > 0) {
        // The caller owns the destination (including logout/workspace changes).
        // Do not replace its route with the newly created note.
        createdId.current = null
        setLeaving(false)
        pendingFlushes.current.splice(0).forEach(resolve => resolve(true))
      } else if (succeeded && mounted.current && destinationAfterSave.current) {
        const destination = destinationAfterSave.current
        destinationAfterSave.current = null
        createdId.current = null
        setNavigating(true)
        router.push(destination)
      } else if (succeeded && mounted.current && createdId.current) {
        // Switching routes before queued edits finish can remount this editor
        // with the first version. Navigate only after the last write commits.
        const destination = createdId.current
        createdId.current = null
        setNavigating(true)
        router.replace(`/notes/${destination}`)
      }
    }
  }, [content, notify, onCreate, onUpdate, projectId, router, title])

  React.useEffect(() => { latestSave.current = save }, [save])

  React.useEffect(() => {
    mounted.current = true
    const flushes = pendingFlushes.current
    const unregister = registerPendingChanges(() => {
      // An earlier link already owns this navigation.
      if (destinationAfterSave.current) return Promise.resolve(false)
      if (!dirty.current && !saving.current) return Promise.resolve(true)
      setLeaving(true)
      if (timer.current) clearTimeout(timer.current)
      return new Promise<boolean>(resolve => {
        pendingFlushes.current.push(resolve)
        void latestSave.current?.()
      })
    })
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty.current && !saving.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    const beforeNavigate = (event: MouseEvent) => {
      if ((!dirty.current && !saving.current) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const target = new URL(anchor.href, window.location.href)
      if (target.origin !== window.location.origin || target.href === window.location.href) return
      if (target.pathname === window.location.pathname && target.search === window.location.search) return
      // Next links normally unmount the editor before the debounce fires.
      // Hold same-origin navigation until the last queued write commits.
      event.preventDefault()
      event.stopPropagation()
      if (pendingFlushes.current.length > 0) return
      destinationAfterSave.current = `${target.pathname}${target.search}${target.hash}`
      setLeaving(true)
      if (timer.current) clearTimeout(timer.current)
      void latestSave.current?.()
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('click', beforeNavigate, true)
    return () => {
      mounted.current = false
      unregister()
      flushes.splice(0).forEach(resolve => resolve(false))
      // Browser back/forward cannot be delayed by an App Router page. Finish
      // queued writes on unmount, without redirecting away from the new page.
      if (dirty.current) void latestSave.current?.()
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('click', beforeNavigate, true)
    }
  }, [])

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
              })
            }}
            loading={pending || navigating || leaving}
          >
            Guardar ahora
          </Button>
          {currentId && onDelete ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmDelete(true)}
              aria-label="Eliminar nota"
              disabled={state === 'saving' || pending || navigating || leaving}
            >
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </div>

      <Input
        disabled={navigating || leaving || deleting}
        maxLength={200}
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
          disabled={navigating || leaving || deleting}
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
        disabled={navigating || leaving || deleting}
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

      <Dialog open={confirmDelete} onOpenChange={next => { if (!pending) setConfirmDelete(next) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar esta nota?</DialogTitle>
            <DialogDescription>
              Saldrá de tu biblioteca y de los resultados de búsqueda.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              disabled={state === 'saving'}
              onClick={() => {
                if (!currentId || !onDelete || saving.current) return
                if (timer.current) clearTimeout(timer.current)
                const wasDirty = dirty.current
                dirty.current = false
                setDeleting(true)
                startTransition(async () => {
                  try {
                    const result = await onDelete(currentId)
                    if (!result.ok) {
                      dirty.current = wasDirty
                      setError(result.error)
                      setConfirmDelete(false)
                      setDeleting(false)
                      return
                    }
                    setNavigating(true)
                    router.push('/library')
                    router.refresh()
                  } catch {
                    dirty.current = wasDirty
                    setError('No pudimos eliminar la nota. Intenta de nuevo.')
                    setConfirmDelete(false)
                    setDeleting(false)
                  }
                })
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

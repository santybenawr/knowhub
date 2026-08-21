'use client'

import { useRouter } from 'next/navigation'
import * as React from 'react'
import { FileText, FolderKanban, Mic, NotebookPen, Search, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/field'
import { cn } from '@/lib/utils'

type Command = {
  id: string
  label: string
  hint?: string
  icon: React.ReactNode
  run: () => void
}

/** §120 — Cmd/Ctrl + K. */
export function CommandPalette({ projects }: { projects: Array<{ id: string; name: string; icon: string }> }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const [highlighted, setHighlighted] = React.useState(0)

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = React.useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      router.push(href)
    },
    [router],
  )

  const commands = React.useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: 'search', label: 'Buscar', hint: 'En toda la biblioteca', icon: <Search className="size-4" />, run: () => go('/search') },
      { id: 'ask', label: 'Preguntar a KnowHub', icon: <Sparkles className="size-4" />, run: () => go('/ask') },
      { id: 'record', label: 'Grabar reunión', icon: <Mic className="size-4" />, run: () => go('/meetings/new') },
      { id: 'upload', label: 'Subir documento', icon: <FileText className="size-4" />, run: () => go('/library?upload=1') },
      { id: 'note', label: 'Crear nota', icon: <NotebookPen className="size-4" />, run: () => go('/notes/new') },
    ]
    const projectCommands: Command[] = projects.map((project) => ({
      id: `project-${project.id}`,
      label: `Ir a ${project.name}`,
      hint: 'Proyecto',
      icon: <FolderKanban className="size-4" />,
      run: () => go(`/projects/${project.id}`),
    }))
    return [...base, ...projectCommands]
  }, [go, projects])

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((command) => command.label.toLowerCase().includes(q))
  }, [commands, query])

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlighted((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlighted((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      filtered[highlighted]?.run()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0">
        <div className="sr-only">
          <DialogTitle>Paleta de comandos</DialogTitle>
          <DialogDescription>Busca acciones y proyectos.</DialogDescription>
        </div>
        <div className="border-b border-border-subtle p-3">
          <Input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Reset the cursor here rather than in an effect: the filtered
              // list changes as a direct result of this event.
              setHighlighted(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar acción o proyecto..."
            aria-label="Buscar acción"
            className="border-0 focus:border-0"
          />
        </div>
        <ul className="max-h-80 overflow-y-auto p-1.5" role="listbox">
          {filtered.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                onClick={command.run}
                onMouseEnter={() => setHighlighted(index)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  index === highlighted ? 'bg-surface-muted text-ink' : 'text-ink-muted',
                )}
              >
                <span className="text-ink-faint">{command.icon}</span>
                <span className="flex-1">{command.label}</span>
                {command.hint ? <span className="text-xs text-ink-faint">{command.hint}</span> : null}
              </button>
            </li>
          ))}
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-ink-faint">Sin resultados</li>
          ) : null}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ResourceKind } from '@/server/search/types'

const KINDS: Array<{ value: ResourceKind | null; label: string }> = [
  { value: null, label: 'Todos' },
  { value: 'document', label: 'Documentos' },
  { value: 'note', label: 'Notas' },
  { value: 'meeting', label: 'Reuniones' },
]

/** §51 — Filters live in the URL so a filtered view can be shared and revisited. */
export function LibraryFilters({
  projects,
  selectedKind,
  selectedProject,
}: {
  projects: Array<{ id: string; name: string }>
  selectedKind: ResourceKind | null
  selectedProject: string | null
}) {
  const router = useRouter()
  const params = useSearchParams()

  const apply = (key: 'kind' | 'project', value: string | null) => {
    const next = new URLSearchParams(params.toString())
    next.delete('upload')
    if (value) next.set(key, value)
    else next.delete(key)
    router.push(`/library${next.size > 0 ? `?${next.toString()}` : ''}`)
  }

  return (
    <div className="space-y-2.5">
      <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por tipo">
        {KINDS.map((option) => (
          <Chip
            key={option.label}
            active={selectedKind === option.value}
            onClick={() => apply('kind', option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </div>

      {projects.length > 0 ? (
        <div
          className="scrollbar-thin flex gap-2 overflow-x-auto pb-1"
          role="group"
          aria-label="Filtrar por proyecto"
        >
          <Chip active={selectedProject === null} onClick={() => apply('project', null)}>
            Todos los proyectos
          </Chip>
          {projects.map((project) => (
            <Chip
              key={project.id}
              active={selectedProject === project.id}
              onClick={() => apply('project', project.id)}
            >
              {project.name}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors',
        active
          ? 'border-brand bg-brand-soft text-brand-ink'
          : 'border-border-subtle bg-surface text-ink-muted hover:border-border-strong hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

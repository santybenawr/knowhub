'use client'

import { useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DOCUMENT_FORMATS, type DocumentFormat } from '@/lib/document-formats'
import { Select } from '@/components/ui/field'
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
  selectedFormat,
}: {
  projects: Array<{ id: string; name: string }>
  selectedKind: ResourceKind | null
  selectedProject: string | null
  selectedFormat: DocumentFormat | null
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const apply = (key: 'kind' | 'project' | 'format', value: string | null) => {
    const next = new URLSearchParams(params.toString())
    next.delete('upload')
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'kind' && value !== 'document') next.delete('format')
    if (key === 'format' && value) next.set('kind', 'document')
    startTransition(() => router.push(`/library${next.size > 0 ? `?${next.toString()}` : ''}`, { scroll: false }))
  }

  return (
    <fieldset className="space-y-2.5" disabled={pending} aria-busy={pending}>
      <legend className="sr-only">Filtros de biblioteca</legend>
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

      {selectedKind === null || selectedKind === 'document' ? (
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="library-format" className="text-sm text-ink-muted">Formato de documento</label>
          <Select id="library-format" value={selectedFormat ?? ''} onChange={event => apply('format', event.target.value || null)} className="w-auto min-w-44">
            <option value="">Todos los formatos</option>
            {DOCUMENT_FORMATS.map(format => <option key={format.value} value={format.value}>{format.label}</option>)}
          </Select>
        </div>
      ) : null}

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
      <p className="text-xs text-ink-faint" role="status">{pending ? 'Actualizando resultados…' : 'Combina un tipo de contenido con un proyecto.'}</p>
    </fieldset>
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

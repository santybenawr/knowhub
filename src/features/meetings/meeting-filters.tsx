'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

/** §193 — Project filter. Kept in the URL so a filtered view is shareable. */
export function MeetingFilters({
  projects,
  selected,
}: {
  projects: Array<{ id: string; name: string }>
  selected: string | null
}) {
  const router = useRouter()
  const params = useSearchParams()

  const apply = (projectId: string | null) => {
    const next = new URLSearchParams(params.toString())
    if (projectId) next.set('project', projectId)
    else next.delete('project')
    router.push(`/meetings${next.size > 0 ? `?${next.toString()}` : ''}`)
  }

  return (
    <div className="scrollbar-thin flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar por proyecto">
      <FilterChip active={selected === null} onClick={() => apply(null)}>
        Todas
      </FilterChip>
      {projects.map((project) => (
        <FilterChip key={project.id} active={selected === project.id} onClick={() => apply(project.id)}>
          {project.name}
        </FilterChip>
      ))}
    </div>
  )
}

function FilterChip({
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

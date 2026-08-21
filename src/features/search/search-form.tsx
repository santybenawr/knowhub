'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import type { ResourceKind } from '@/server/search/types'

export function SearchForm({
  initialQuery,
  projects,
  selectedKind,
  selectedProject,
}: {
  initialQuery: string
  projects: Array<{ id: string; name: string }>
  selectedKind: ResourceKind | null
  selectedProject: string | null
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState(initialQuery)
  const [kind, setKind] = React.useState(selectedKind ?? '')
  const [project, setProject] = React.useState(selectedProject ?? '')

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (kind) params.set('kind', kind)
    if (project) params.set('project', project)
    router.push(`/search${params.size > 0 ? `?${params.toString()}` : ''}`)
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca una idea, una decisión, un nombre..."
          aria-label="Búsqueda"
          autoFocus
          className="flex-1"
        />
        <Button type="submit" aria-label="Buscar">
          <Search />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          aria-label="Tipo de recurso"
          className="max-w-[10rem]"
        >
          <option value="">Todos los tipos</option>
          <option value="document">Documentos</option>
          <option value="note">Notas</option>
          <option value="meeting">Reuniones</option>
        </Select>

        {projects.length > 0 ? (
          <Select
            value={project}
            onChange={(event) => setProject(event.target.value)}
            aria-label="Proyecto"
            className="max-w-[12rem]"
          >
            <option value="">Todos los proyectos</option>
            {projects.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
    </form>
  )
}

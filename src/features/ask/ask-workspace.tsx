'use client'

import * as React from 'react'
import { Select } from '@/components/ui/field'
import { AskPanel } from './ask-panel'
import type { AskScope } from './use-ask'

/** §102 — Scope selector: all knowledge, a project, or a single meeting. */
export function AskWorkspace({
  projects,
  meetings,
  recentConversations,
}: {
  projects: Array<{ id: string; name: string }>
  meetings: Array<{ id: string; title: string }>
  recentConversations: Array<{ id: string; title: string; scope: string }>
}) {
  const [value, setValue] = React.useState('workspace')

  const scope: AskScope = React.useMemo(() => {
    const [type, id] = value.split(':')
    if (type === 'project' && id) return { type: 'project', projectId: id }
    if (type === 'meeting' && id) return { type: 'meeting', meetingId: id }
    return { type: 'workspace' }
  }, [value])

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2.5 text-sm">
        <span className="shrink-0 text-ink-muted">Buscar en</span>
        <Select
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="max-w-xs"
          aria-label="Alcance de la consulta"
        >
          <option value="workspace">Todo mi conocimiento</option>
          {projects.length > 0 ? (
            <optgroup label="Proyecto">
              {projects.map((project) => (
                <option key={project.id} value={`project:${project.id}`}>
                  {project.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {meetings.length > 0 ? (
            <optgroup label="Reunión">
              {meetings.map((meeting) => (
                <option key={meeting.id} value={`meeting:${meeting.id}`}>
                  {meeting.title}
                </option>
              ))}
            </optgroup>
          ) : null}
        </Select>
      </label>

      {/* Remounting on scope change starts a fresh conversation, which is what
          the user means by switching scope. */}
      <AskPanel
        key={value}
        scope={scope}
        suggestions={[
          '¿Qué decisiones tomamos esta semana?',
          '¿Quién tiene pendientes?',
          '¿Qué dice mi biblioteca sobre presupuesto?',
        ]}
      />

      {recentConversations.length > 0 ? (
        <section className="border-t border-border-subtle pt-5">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Conversaciones recientes
          </h2>
          <ul className="space-y-1">
            {recentConversations.map((conversation) => (
              <li key={conversation.id} className="truncate text-sm text-ink-muted">
                {conversation.title}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

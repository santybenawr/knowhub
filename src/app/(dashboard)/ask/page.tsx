import type { Metadata } from 'next'
import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { listMeetings } from '@/server/meetings'
import { listConversations } from '@/server/conversations'
import { AskWorkspace } from '@/features/ask/ask-workspace'
import { ProviderNotice } from '@/components/shared/provider-notice'

export const metadata: Metadata = { title: 'Preguntar a KnowHub' }

/** §102/§103 — Global Ask, with a scope selector across the whole library. */
export default async function AskPage() {
  const { access } = await requirePageContext('ai:use')

  const [projects, meetings, conversations] = await Promise.all([
    listProjects(access.workspaceId),
    listMeetings(access.workspaceId, { limit: 25 }),
    listConversations(access, 12),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Preguntar a KnowHub</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Respondemos únicamente con lo que hay en tu biblioteca, siempre con la fuente.
        </p>
      </div>

      <ProviderNotice />

      <AskWorkspace
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title }))}
        recentConversations={conversations.map((c) => ({ id: c.id, title: c.title, scope: c.scope }))}
      />
    </div>
  )
}

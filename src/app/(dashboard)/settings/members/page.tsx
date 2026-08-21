import type { Metadata } from 'next'
import { requirePageContext } from '@/server/auth/guard'
import { listMembers } from '@/server/workspaces'
import { can, ROLE_LABELS } from '@/server/permissions'
import { MembersManager } from '@/features/settings/members-manager'
import { changeMemberRoleAction, inviteMemberAction, removeMemberAction } from '../actions'

export const metadata: Metadata = { title: 'Miembros' }

/** §163 — Team invitations. */
export default async function MembersPage() {
  const { access, user } = await requirePageContext()
  const members = await listMembers(access.workspaceId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Miembros</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Quién puede ver y editar el conocimiento de {access.workspaceName}.
        </p>
      </div>

      <MembersManager
        members={members.map((member) => ({
          userId: member.userId,
          name: member.name,
          email: member.email,
          role: member.role,
          roleLabel: ROLE_LABELS[member.role],
          isSelf: member.userId === user.id,
        }))}
        currentRole={access.role}
        canManage={can(access.role, 'members:manage')}
        onInvite={inviteMemberAction}
        onChangeRole={changeMemberRoleAction}
        onRemove={removeMemberAction}
      />
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Copy, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { initialsOf } from '@/lib/text'
import type { ActionResult } from '@/lib/action-result'
import type { WorkspaceRole } from '@/server/db/schema'

const ASSIGNABLE: WorkspaceRole[] = ['ADMIN', 'MEMBER', 'VIEWER']
const LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
  VIEWER: 'Lector',
}

export function MembersManager({
  members,
  currentRole,
  canManage,
  onInvite,
  onChangeRole,
  onRemove,
}: {
  members: Array<{
    userId: string
    name: string
    email: string
    role: WorkspaceRole
    roleLabel: string
    isSelf: boolean
  }>
  currentRole: string
  canManage: boolean
  onInvite: (input: {
    email: string
    role: WorkspaceRole
  }) => Promise<ActionResult<{ inviteUrl: string }>>
  onChangeRole: (input: { userId: string; role: WorkspaceRole }) => Promise<ActionResult<undefined>>
  onRemove: (userId: string) => Promise<ActionResult<undefined>>
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [email, setEmail] = React.useState('')
  const [role, setRole] = React.useState<WorkspaceRole>('MEMBER')
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  return (
    <div className="space-y-6">
      {canManage ? (
        <section className="surface-card p-5">
          <h2 className="text-lg font-semibold text-ink">Invitar a alguien</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <Field label="Correo" htmlFor="invite-email">
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="persona@empresa.com"
                className="w-64"
              />
            </Field>
            <Field label="Rol" htmlFor="invite-role">
              <Select
                id="invite-role"
                value={role}
                onChange={(event) => setRole(event.target.value as WorkspaceRole)}
                className="w-44"
              >
                {ASSIGNABLE.filter((option) => currentRole === 'OWNER' || option !== 'ADMIN').map(
                  (option) => (
                    <option key={option} value={option}>
                      {LABELS[option]}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Button
              loading={pending}
              disabled={!email.trim()}
              onClick={() =>
                startTransition(async () => {
                  const result = await onInvite({ email, role })
                  if (result.ok) {
                    setInviteUrl(result.data.inviteUrl)
                    setEmail('')
                    notify('Invitación creada.', 'success')
                  } else {
                    notify(result.error, 'error')
                  }
                })
              }
            >
              <UserPlus /> Invitar
            </Button>
          </div>

          {inviteUrl ? (
            <div className="mt-4 rounded-lg border border-border-strong bg-surface-muted p-3">
              <p className="text-sm font-medium text-ink">Comparte este enlace</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                KnowHub no tiene servicio de correo configurado, así que el enlace se entrega aquí. Es
                válido por 7 días.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-surface px-2 py-1.5 font-mono text-xs text-ink">
                  {inviteUrl}
                </code>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(`${window.location.origin}${inviteUrl}`)
                      .then(() => notify('Enlace copiado.', 'success'))
                  }}
                >
                  <Copy /> Copiar
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
        </h2>
        <ul className="surface-card divide-y divide-border-subtle">
          {members.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink"
                aria-hidden
              >
                {initialsOf(member.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {member.name}
                  {member.isSelf ? <span className="ml-1.5 text-xs text-ink-faint">(tú)</span> : null}
                </p>
                <p className="truncate text-xs text-ink-faint">{member.email}</p>
              </div>

              {canManage && member.role !== 'OWNER' && !member.isSelf ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    aria-label={`Rol de ${member.name}`}
                    className="h-8 w-36 text-xs"
                    onChange={(event) =>
                      startTransition(async () => {
                        const result = await onChangeRole({
                          userId: member.userId,
                          role: event.target.value as WorkspaceRole,
                        })
                        notify(result.ok ? 'Rol actualizado.' : result.error, result.ok ? 'success' : 'error')
                        router.refresh()
                      })
                    }
                  >
                    {ASSIGNABLE.map((option) => (
                      <option key={option} value={option}>
                        {LABELS[option]}
                      </option>
                    ))}
                  </Select>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await onRemove(member.userId)
                        notify(result.ok ? 'Miembro removido.' : result.error, result.ok ? 'success' : 'error')
                        router.refresh()
                      })
                    }
                  >
                    Quitar
                  </Button>
                </div>
              ) : (
                <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-xs font-medium text-ink-muted">
                  {member.roleLabel}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Field, Input, Select } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import type { ActionResult } from '@/lib/action-result'
import type { WorkspaceType } from '@/server/db/schema'

export function WorkspaceSettingsForm({
  workspaceName,
  canManage,
  onRename,
  onCreate,
}: {
  workspaceName: string
  canManage: boolean
  onRename: (name: string) => Promise<ActionResult<undefined>>
  onCreate: (input: {
    name: string
    type: WorkspaceType
  }) => Promise<ActionResult<{ workspaceId: string }>>
}) {
  const router = useRouter()
  const { notify } = useToast()
  const [name, setName] = React.useState(workspaceName)
  const [newName, setNewName] = React.useState('')
  const [newType, setNewType] = React.useState<WorkspaceType>('team')
  const [pending, startTransition] = React.useTransition()

  return (
    <div className="space-y-6">
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold text-ink">Workspace actual</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Nombre" htmlFor="workspace-name">
            <Input
              id="workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canManage}
              className="w-64"
            />
          </Field>
          {canManage ? (
            <Button
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await onRename(name)
                  notify(result.ok ? 'Workspace actualizado.' : result.error, result.ok ? 'success' : 'error')
                })
              }
            >
              Guardar
            </Button>
          ) : null}
        </div>
        {!canManage ? (
          <p className="mt-2 text-xs text-ink-faint">Tu rol no permite modificar el workspace.</p>
        ) : null}
      </section>

      {/* §15 — a personal workspace is created at signup; more are created here. */}
      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold text-ink">Crear otro workspace</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Separa contextos: estudio, equipo o empresa. Cada uno tiene su propia biblioteca y sus propios
          miembros.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Nombre" htmlFor="new-workspace-name">
            <Input
              id="new-workspace-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Equipo de producto"
              className="w-64"
            />
          </Field>
          <Field label="Tipo" htmlFor="new-workspace-type">
            <Select
              id="new-workspace-type"
              value={newType}
              onChange={(event) => setNewType(event.target.value as WorkspaceType)}
              className="w-44"
            >
              <option value="team">Equipo</option>
              <option value="education">Educación</option>
              <option value="business">Empresa</option>
              <option value="personal">Personal</option>
            </Select>
          </Field>
          <Button
            variant="secondary"
            disabled={!newName.trim()}
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await onCreate({ name: newName, type: newType })
                if (result.ok) {
                  notify('Workspace creado.', 'success')
                  setNewName('')
                  router.refresh()
                } else {
                  notify(result.error, 'error')
                }
              })
            }
          >
            Crear
          </Button>
        </div>
      </section>
    </div>
  )
}

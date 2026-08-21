'use client'

import * as React from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ROLE_LABELS } from '@/server/permissions/policy'
import type { ActionResult } from '@/lib/action-result'
import type { WorkspaceRole } from '@/server/db/schema'

export function ProfileForm({
  name: initialName,
  email,
  timezone: initialTimezone,
  workspaceName,
  role,
  onSave,
  onLogout,
}: {
  name: string
  email: string
  timezone: string
  workspaceName: string
  role: WorkspaceRole
  onSave: (input: { name: string; timezone: string }) => Promise<ActionResult<undefined>>
  onLogout: () => Promise<void>
}) {
  const { notify } = useToast()
  const [name, setName] = React.useState(initialName)
  const [timezone, setTimezone] = React.useState(initialTimezone)
  const [pending, startTransition] = React.useTransition()

  return (
    <section className="surface-card space-y-4 p-5">
      <Field label="Nombre" htmlFor="profile-name">
        <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>

      <Field label="Correo" htmlFor="profile-email" hint="El correo de acceso no se puede cambiar aquí.">
        <Input id="profile-email" value={email} disabled />
      </Field>

      <Field label="Zona horaria" htmlFor="profile-timezone" hint="Se usa para fechas y agrupaciones.">
        <Input
          id="profile-timezone"
          value={timezone}
          onChange={(event) => setTimezone(event.target.value)}
          placeholder="America/Bogota"
        />
      </Field>

      <div className="rounded-lg bg-surface-muted p-3 text-sm">
        <p className="text-ink-muted">
          Workspace actual: <span className="font-medium text-ink">{workspaceName}</span> ·{' '}
          {ROLE_LABELS[role]}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Button
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await onSave({ name, timezone })
              notify(result.ok ? 'Perfil actualizado.' : result.error, result.ok ? 'success' : 'error')
            })
          }
        >
          Guardar cambios
        </Button>

        <Button variant="ghost" onClick={() => startTransition(() => void onLogout())}>
          <LogOut /> Cerrar sesión
        </Button>
      </div>
    </section>
  )
}

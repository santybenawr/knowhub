'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import type { ActionResult } from '@/lib/action-result'

export function InvitationForm({ onAccept }: { onAccept: () => Promise<ActionResult<undefined>> }) {
  const [result, action, pending] = useActionState<ActionResult<undefined> | null, FormData>(
    () => onAccept(),
    null,
  )

  return (
    <form action={action} className="mt-6 space-y-4">
      {result && !result.ok ? (
        <p role="alert" className="text-sm text-record">{result.error}</p>
      ) : null}
      <Button type="submit" loading={pending}>
        {pending ? 'Aceptando invitación…' : 'Aceptar invitación'}
      </Button>
    </form>
  )
}

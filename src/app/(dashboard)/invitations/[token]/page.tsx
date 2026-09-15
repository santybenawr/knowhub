import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { Button } from '@/components/ui/button'
import { InvitationForm } from './invitation-form'
import { acceptInvitationAction } from './actions'

export const metadata: Metadata = { title: 'Invitación', robots: { index: false, follow: false } }

/** §163 — Accepting an invitation requires being signed in as the invitee. */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`)

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold text-ink">Te invitaron a un workspace</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Estás usando la cuenta <strong className="break-all">{user.email}</strong>.
        Solo puedes aceptar si la invitación está dirigida a este correo.
      </p>
      <InvitationForm onAccept={acceptInvitationAction.bind(null, token)} />
      <Button asChild variant="ghost" className="mt-4">
        <Link href="/dashboard">Volver a mi KnowHub</Link>
      </Button>
    </div>
  )
}

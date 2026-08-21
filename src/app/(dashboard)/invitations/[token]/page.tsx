import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getCurrentUser } from '@/server/auth/session'
import { acceptInvitation } from '@/server/workspaces'
import { WORKSPACE_COOKIE } from '@/server/auth/guard'
import { shouldUseSecureCookies } from '@/server/auth/cookie'
import { toUserMessage } from '@/lib/errors'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Invitación' }

/** §163 — Accepting an invitation requires being signed in as the invitee. */
export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const user = await getCurrentUser()
  if (!user) redirect(`/login?next=/invitations/${token}`)

  let error: string | null = null
  try {
    const workspaceId = await acceptInvitation(token, user.id)
    const store = await cookies()
    store.set(WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookies(),
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  } catch (err) {
    error = toUserMessage(err)
  }

  if (!error) redirect('/dashboard')

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="text-xl font-semibold text-ink">No pudimos aceptar la invitación</h1>
      <p className="mt-2 text-sm text-ink-muted">{error}</p>
      <Button asChild className="mt-6">
        <Link href="/dashboard">Ir a mi KnowHub</Link>
      </Button>
    </div>
  )
}

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { fail, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'
import { requireUser } from '@/server/auth/session'
import { WORKSPACE_COOKIE } from '@/server/auth/guard'
import { shouldUseSecureCookies } from '@/server/auth/cookie'
import { acceptInvitation } from '@/server/workspaces'

const tokenSchema = z.string().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/)

export async function acceptInvitationAction(token: string): Promise<ActionResult<undefined>> {
  try {
    const user = await requireUser()
    const parsed = tokenSchema.safeParse(token)
    if (!parsed.success) return fail('Esta invitación no es válida.')
    const workspaceId = await acceptInvitation(parsed.data, user.id)
    const store = await cookies()
    store.set(WORKSPACE_COOKIE, workspaceId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookies(),
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })
  } catch (err) {
    return fail(toUserMessage(err))
  }
  // redirect throws a framework control-flow exception; do not catch it.
  redirect('/dashboard')
}

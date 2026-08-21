'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { requirePageContext, WORKSPACE_COOKIE } from '@/server/auth/guard'
import { shouldUseSecureCookies } from '@/server/auth/cookie'
import { requireWorkspaceAccess } from '@/server/permissions'
import { destroySession } from '@/server/auth/session'
import { redirect } from 'next/navigation'

/** Shell-level actions shared by every authenticated page. */

export async function switchWorkspaceAction(workspaceId: string): Promise<void> {
  const { user } = await requirePageContext()
  // Validate membership before writing the cookie: the id came from the client.
  await requireWorkspaceAccess(user.id, workspaceId)

  const store = await cookies()
  store.set(WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })

  const db = await getDb()
  await db.update(users).set({ lastWorkspaceId: workspaceId }).where(eq(users.id, user.id))

  revalidatePath('/', 'layout')
}

export async function logoutAction(): Promise<void> {
  await destroySession()
  redirect('/login')
}

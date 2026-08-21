'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { requirePageContext } from '@/server/auth/guard'
import {
  changeMemberRole,
  createWorkspace,
  inviteMember,
  removeMember,
  renameWorkspace,
} from '@/server/workspaces'
import { fail, ok, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'
import type { WorkspaceRole, WorkspaceType } from '@/server/db/schema'

export async function renameWorkspaceAction(name: string): Promise<ActionResult<undefined>> {
  try {
    const { access } = await requirePageContext('workspace:manage')
    if (!name.trim()) return fail('Ingresa un nombre.')
    await renameWorkspace(access, name)
    revalidatePath('/', 'layout')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function createWorkspaceAction(input: {
  name: string
  type: WorkspaceType
}): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const { user } = await requirePageContext()
    if (!input.name.trim()) return fail('Ingresa un nombre.')
    const workspaceId = await createWorkspace({ userId: user.id, name: input.name, type: input.type })
    revalidatePath('/', 'layout')
    return ok({ workspaceId })
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

/**
 * §163 — Returns the invitation link instead of emailing it: no mail transport
 * is configured, and pretending to send one would strand the invitee.
 */
export async function inviteMemberAction(input: {
  email: string
  role: WorkspaceRole
}): Promise<ActionResult<{ inviteUrl: string }>> {
  try {
    const { access } = await requirePageContext('members:manage')
    const { token } = await inviteMember({ access, email: input.email, role: input.role })
    revalidatePath('/settings/members')
    return ok({ inviteUrl: `/invitations/${token}` })
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function changeMemberRoleAction(input: {
  userId: string
  role: WorkspaceRole
}): Promise<ActionResult<undefined>> {
  try {
    const { access } = await requirePageContext('members:manage')
    await changeMemberRole({ access, targetUserId: input.userId, role: input.role })
    revalidatePath('/settings/members')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function removeMemberAction(userId: string): Promise<ActionResult<undefined>> {
  try {
    const { access } = await requirePageContext('members:manage')
    await removeMember(access, userId)
    revalidatePath('/settings/members')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

export async function updateProfileAction(input: {
  name: string
  timezone: string
}): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    if (!input.name.trim()) return fail('Ingresa tu nombre.')
    const db = await getDb()
    await db
      .update(users)
      .set({
        name: input.name.trim().slice(0, 80),
        timezone: input.timezone.slice(0, 60),
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
    revalidatePath('/', 'layout')
    return ok()
  } catch (err) {
    return fail(toUserMessage(err))
  }
}

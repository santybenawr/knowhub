import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  users,
  workspaceInvitations,
  workspaceMembers,
  workspaces,
  type WorkspaceRole,
  type WorkspaceType,
} from '@/server/db/schema'
import { generateToken, hashToken } from '@/lib/crypto'
import { slugify } from '@/lib/text'
import { forbidden, notFound, validation } from '@/lib/errors'
import { checkLimit, getPlanLimits } from '@/config/plans'
import { recordAudit } from '@/server/audit'
import { canAssignRole, type WorkspaceAccess } from '@/server/permissions'

/** §15 — Workspaces are the tenancy boundary; every private resource lives in one. */

export async function createWorkspace(input: {
  userId: string
  name: string
  type: WorkspaceType
}): Promise<string> {
  const db = await getDb()
  const base = slugify(input.name) || 'workspace'
  const slug = `${base}-${generateToken(4).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)}`

  const workspaceId = await db.transaction(async (tx) => {
    const rows = await tx
      .insert(workspaces)
      .values({ name: input.name.trim().slice(0, 120), slug, type: input.type, ownerId: input.userId })
      .returning({ id: workspaces.id })
    const workspace = rows[0]
    if (!workspace) throw new Error('No pudimos crear el workspace.')
    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: input.userId,
      role: 'OWNER',
    })
    return workspace.id
  })

  await recordAudit({
    action: 'workspace_created',
    workspaceId,
    actorId: input.userId,
    resourceType: 'workspace',
    resourceId: workspaceId,
    metadata: { type: input.type },
  })
  return workspaceId
}

export async function renameWorkspace(access: WorkspaceAccess, name: string): Promise<void> {
  const db = await getDb()
  await db
    .update(workspaces)
    .set({ name: name.trim().slice(0, 120), updatedAt: new Date() })
    .where(eq(workspaces.id, access.workspaceId))
}

export async function listMembers(workspaceId: string) {
  const db = await getDb()
  return db
    .select({
      id: workspaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt)
}

/**
 * §163 — Invitations. The token is returned to the caller for delivery: no mail
 * transport is configured, and a silently-dropped email is worse than an
 * explicit link the admin can share.
 */
export async function inviteMember(input: {
  access: WorkspaceAccess
  email: string
  role: WorkspaceRole
}): Promise<{ token: string }> {
  const db = await getDb()
  if (!canAssignRole(input.access.role, input.role)) {
    throw forbidden('No puedes asignar un rol igual o superior al tuyo.')
  }

  const limits = getPlanLimits(input.access.plan)
  const members = await listMembers(input.access.workspaceId)
  const check = checkLimit(limits, 'maxMembers', members.length)
  if (!check.allowed) throw validation(check.reason)

  const email = input.email.trim().toLowerCase()
  if (members.some((m) => m.email.toLowerCase() === email)) {
    throw validation('Esta persona ya es miembro del workspace.')
  }

  const token = generateToken(24)
  await db.insert(workspaceInvitations).values({
    workspaceId: input.access.workspaceId,
    email,
    role: input.role,
    tokenHash: hashToken(token),
    invitedBy: input.access.userId,
    expiresAt: new Date(Date.now() + 7 * 86_400_000),
  })

  await recordAudit({
    action: 'member_invited',
    workspaceId: input.access.workspaceId,
    actorId: input.access.userId,
    metadata: { role: input.role },
  })

  return { token }
}

export async function acceptInvitation(token: string, userId: string): Promise<string> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(workspaceInvitations)
    .where(and(eq(workspaceInvitations.tokenHash, hashToken(token)), isNull(workspaceInvitations.acceptedAt)))
    .limit(1)

  const invitation = rows[0]
  if (!invitation) throw notFound('Esta invitación no es válida.')
  if (invitation.expiresAt.getTime() < Date.now()) throw validation('Esta invitación expiró.')

  await db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: invitation.workspaceId, userId, role: invitation.role })
      .onConflictDoNothing()
    await tx
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id))
  })

  return invitation.workspaceId
}

export async function changeMemberRole(input: {
  access: WorkspaceAccess
  targetUserId: string
  role: WorkspaceRole
}): Promise<void> {
  const db = await getDb()
  if (!canAssignRole(input.access.role, input.role)) {
    throw forbidden('No puedes asignar un rol igual o superior al tuyo.')
  }

  const owner = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, input.access.workspaceId))
    .limit(1)
  // The owner's own role is structural; changing it would orphan the workspace.
  if (owner[0]?.ownerId === input.targetUserId) {
    throw forbidden('No puedes cambiar el rol del propietario del workspace.')
  }

  await db
    .update(workspaceMembers)
    .set({ role: input.role })
    .where(
      and(
        eq(workspaceMembers.workspaceId, input.access.workspaceId),
        eq(workspaceMembers.userId, input.targetUserId),
      ),
    )

  await recordAudit({
    action: 'role_changed',
    workspaceId: input.access.workspaceId,
    actorId: input.access.userId,
    metadata: { role: input.role },
  })
}

export async function removeMember(access: WorkspaceAccess, targetUserId: string): Promise<void> {
  const db = await getDb()
  const owner = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, access.workspaceId))
    .limit(1)
  if (owner[0]?.ownerId === targetUserId) {
    throw forbidden('No puedes quitar al propietario del workspace.')
  }

  await db
    .delete(workspaceMembers)
    .where(
      and(eq(workspaceMembers.workspaceId, access.workspaceId), eq(workspaceMembers.userId, targetUserId)),
    )

  await recordAudit({
    action: 'member_removed',
    workspaceId: access.workspaceId,
    actorId: access.userId,
  })
}

export async function softDeleteWorkspace(access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await db
    .update(workspaces)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(workspaces.id, access.workspaceId))
  await recordAudit({
    action: 'workspace_deleted',
    workspaceId: access.workspaceId,
    actorId: access.userId,
  })
}

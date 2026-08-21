import { randomUUID } from 'node:crypto'
import { getDb } from '@/server/db/client'
import { users, workspaceMembers, workspaces, type WorkspaceRole } from '@/server/db/schema'
import type { WorkspaceAccess } from '@/server/permissions'
import { ensureJobHandlers } from '@/server/jobs/register'

ensureJobHandlers()

export async function createTestUser(overrides: { name?: string; email?: string } = {}) {
  const db = await getDb()
  const email = overrides.email ?? `user-${randomUUID()}@knowhub.test`
  const rows = await db
    .insert(users)
    .values({ email, name: overrides.name ?? 'Usuario de prueba' })
    .returning({ id: users.id, email: users.email, name: users.name })
  const user = rows[0]
  if (!user) throw new Error('failed to create test user')
  return user
}

export async function createTestWorkspace(
  userId: string,
  options: { name?: string; role?: WorkspaceRole; plan?: string } = {},
): Promise<WorkspaceAccess> {
  const db = await getDb()
  const name = options.name ?? 'Workspace de prueba'
  const rows = await db
    .insert(workspaces)
    .values({
      name,
      slug: `ws-${randomUUID().slice(0, 12)}`,
      type: 'personal',
      ownerId: userId,
      ...(options.plan ? { plan: options.plan } : {}),
    })
    .returning({ id: workspaces.id, slug: workspaces.slug, plan: workspaces.plan })
  const workspace = rows[0]
  if (!workspace) throw new Error('failed to create test workspace')

  const role = options.role ?? 'OWNER'
  await db.insert(workspaceMembers).values({ workspaceId: workspace.id, userId, role })

  return {
    workspaceId: workspace.id,
    userId,
    role,
    workspaceName: name,
    workspaceSlug: workspace.slug,
    plan: workspace.plan,
  }
}

/** A user with their own workspace: the usual starting point for a test. */
export async function createTestTenant(options: { name?: string; plan?: string } = {}) {
  const user = await createTestUser({ ...(options.name ? { name: options.name } : {}) })
  const access = await createTestWorkspace(user.id, {
    ...(options.name ? { name: `Espacio de ${options.name}` } : {}),
    ...(options.plan ? { plan: options.plan } : {}),
  })
  return { user, access }
}

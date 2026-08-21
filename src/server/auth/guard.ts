import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCurrentUser, listWorkspacesForUser, resolveWorkspace, type ActiveWorkspace, type SessionUser } from './session'
import { requireWorkspaceAccess, type Permission, type WorkspaceAccess } from '@/server/permissions'
import { ensureJobHandlers } from '@/server/jobs/register'

export const WORKSPACE_COOKIE = 'knowhub_workspace'

export type PageContext = {
  user: SessionUser
  workspace: ActiveWorkspace
  workspaces: ActiveWorkspace[]
  access: WorkspaceAccess
}

/**
 * The single entry point every authenticated page and action goes through.
 *
 * It resolves the session, the active workspace and the caller's permissions in
 * one place, so a page never has to remember to check them. The workspace id in
 * the cookie is a *request*, validated against real memberships (§16).
 */
export async function requirePageContext(
  permission: Permission = 'workspace:read',
): Promise<PageContext> {
  ensureJobHandlers()

  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const store = await cookies()
  const requested = store.get(WORKSPACE_COOKIE)?.value ?? user.lastWorkspaceId

  const workspace = await resolveWorkspace(user.id, requested)
  if (!workspace) redirect('/onboarding')

  const [workspaces, access] = await Promise.all([
    listWorkspacesForUser(user.id),
    requireWorkspaceAccess(user.id, workspace.id, permission),
  ])

  return { user, workspace, workspaces, access }
}

/** Same resolution for route handlers, which redirect differently. */
export async function requireApiContext(
  permission: Permission = 'workspace:read',
  requestedWorkspaceId?: string | null,
): Promise<PageContext | null> {
  ensureJobHandlers()

  const user = await getCurrentUser()
  if (!user) return null

  const store = await cookies()
  const requested = requestedWorkspaceId ?? store.get(WORKSPACE_COOKIE)?.value ?? user.lastWorkspaceId

  const workspace = await resolveWorkspace(user.id, requested)
  if (!workspace) return null

  const [workspaces, access] = await Promise.all([
    listWorkspacesForUser(user.id),
    requireWorkspaceAccess(user.id, workspace.id, permission),
  ])

  return { user, workspace, workspaces, access }
}

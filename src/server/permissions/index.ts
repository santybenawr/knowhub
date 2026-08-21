import { and, eq, isNull } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import {
  documents,
  meetings,
  notes,
  projects,
  workspaceMembers,
  workspaces,
  type WorkspaceRole,
} from '@/server/db/schema'
import { forbidden, notFound } from '@/lib/errors'
import { can, type Permission } from './policy'

export * from './policy'

export type WorkspaceAccess = {
  workspaceId: string
  userId: string
  role: WorkspaceRole
  workspaceName: string
  workspaceSlug: string
  plan: string
}

/**
 * §16 — The single gate every tenant-scoped operation goes through.
 *
 * A `workspaceId` arriving from the client is only ever a *candidate*: it is
 * resolved against the caller's memberships here, and callers receive the
 * verified id back. Nothing downstream trusts the raw input.
 */
export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  permission: Permission = 'workspace:read',
): Promise<WorkspaceAccess> {
  const db = await getDb()
  const rows = await db
    .select({
      role: workspaceMembers.role,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
      plan: workspaces.plan,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1)

  const row = rows[0]
  // Deliberately "not found", not "forbidden": a non-member must not be able
  // to probe which workspace ids exist.
  if (!row) throw notFound('No encontramos este workspace.')
  if (!can(row.role, permission)) {
    throw forbidden('Tu rol en este workspace no permite esta acción.')
  }

  return {
    workspaceId,
    userId,
    role: row.role,
    workspaceName: row.workspaceName,
    workspaceSlug: row.workspaceSlug,
    plan: row.plan,
  }
}

/** Resource lookups that fold the workspace predicate into the query itself. */
export async function requireMeetingAccess(
  userId: string,
  meetingId: string,
  permission: Permission = 'content:read',
) {
  const db = await getDb()
  const rows = await db
    .select({ workspaceId: meetings.workspaceId })
    .from(meetings)
    .where(and(eq(meetings.id, meetingId), isNull(meetings.deletedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) throw notFound('No encontramos esta reunión.')
  const access = await requireWorkspaceAccess(userId, row.workspaceId, permission)
  return { ...access, meetingId }
}

export async function requireDocumentAccess(
  userId: string,
  documentId: string,
  permission: Permission = 'content:read',
) {
  const db = await getDb()
  const rows = await db
    .select({ workspaceId: documents.workspaceId })
    .from(documents)
    .where(and(eq(documents.id, documentId), isNull(documents.deletedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) throw notFound('No encontramos este documento.')
  const access = await requireWorkspaceAccess(userId, row.workspaceId, permission)
  return { ...access, documentId }
}

export async function requireNoteAccess(
  userId: string,
  noteId: string,
  permission: Permission = 'content:read',
) {
  const db = await getDb()
  const rows = await db
    .select({ workspaceId: notes.workspaceId })
    .from(notes)
    .where(and(eq(notes.id, noteId), isNull(notes.deletedAt)))
    .limit(1)
  const row = rows[0]
  if (!row) throw notFound('No encontramos esta nota.')
  const access = await requireWorkspaceAccess(userId, row.workspaceId, permission)
  return { ...access, noteId }
}

/** Validates that a project id, if supplied, belongs to the verified workspace. */
export async function assertProjectInWorkspace(
  projectId: string | null | undefined,
  workspaceId: string,
): Promise<string | null> {
  if (!projectId) return null
  const db = await getDb()
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .limit(1)
  if (!rows[0]) throw notFound('El proyecto seleccionado no existe en este workspace.')
  return projectId
}

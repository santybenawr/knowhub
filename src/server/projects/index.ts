import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { projects } from '@/server/db/schema'
import { notFound } from '@/lib/errors'
import type { WorkspaceAccess } from '@/server/permissions'

export type ProjectSummary = {
  id: string
  name: string
  description: string | null
  icon: string
  archivedAt: Date | null
  documentCount: number
  noteCount: number
  meetingCount: number
}

export async function createProject(input: {
  access: WorkspaceAccess
  name: string
  description?: string | null
  icon?: string | null
}): Promise<string> {
  const db = await getDb()
  const rows = await db
    .insert(projects)
    .values({
      workspaceId: input.access.workspaceId,
      createdBy: input.access.userId,
      name: input.name.trim().slice(0, 120),
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || '📁',
    })
    .returning({ id: projects.id })
  const project = rows[0]
  if (!project) throw new Error('No pudimos crear el proyecto.')
  return project.id
}

export async function listProjects(workspaceId: string): Promise<ProjectSummary[]> {
  const db = await getDb()
  // Counts come from correlated subqueries rather than three joins, which would
  // multiply rows against each other.
  //
  // The subqueries are written as literal SQL with their own aliases. Drizzle
  // emits *unqualified* column names when a column is interpolated into a `sql`
  // template, so `${notes.projectId} = ${projects.id}` becomes
  // `"project_id" = "id"` — which resolves against the subquery's own table and
  // silently returns zero. Spelling out the aliases keeps the correlation real.
  return db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      icon: projects.icon,
      archivedAt: projects.archivedAt,
      documentCount: sql<number>`(
        select count(*) from documents d
        where d.project_id = projects.id and d.deleted_at is null
      )`,
      noteCount: sql<number>`(
        select count(*) from notes n
        where n.project_id = projects.id and n.deleted_at is null
      )`,
      meetingCount: sql<number>`(
        select count(*) from meetings m
        where m.project_id = projects.id and m.deleted_at is null
      )`,
    })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .orderBy(asc(projects.archivedAt), desc(projects.updatedAt))
}

export async function getProject(projectId: string, workspaceId: string) {
  const db = await getDb()
  const rows = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
    .limit(1)
  const project = rows[0]
  if (!project) throw notFound('No encontramos este proyecto.')
  return project
}

export async function updateProject(input: {
  access: WorkspaceAccess
  projectId: string
  name?: string
  description?: string | null
  icon?: string | null
  archived?: boolean
}): Promise<void> {
  const db = await getDb()
  await getProject(input.projectId, input.access.workspaceId)
  await db
    .update(projects)
    .set({
      ...(input.name !== undefined ? { name: input.name.trim().slice(0, 120) } : {}),
      ...(input.description !== undefined ? { description: input.description?.trim() || null } : {}),
      ...(input.icon !== undefined ? { icon: input.icon?.trim() || '📁' } : {}),
      ...(input.archived !== undefined ? { archivedAt: input.archived ? new Date() : null } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(projects.id, input.projectId), eq(projects.workspaceId, input.access.workspaceId)))
}

/** Soft delete; contained resources keep existing but lose their project link. */
export async function deleteProject(projectId: string, access: WorkspaceAccess): Promise<void> {
  const db = await getDb()
  await getProject(projectId, access.workspaceId)
  await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.workspaceId, access.workspaceId)))
}

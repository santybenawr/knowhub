import { and, eq, isNull, sql } from 'drizzle-orm'
import { getDb, rawQuery } from '@/server/db/client'
import { documents, meetings, notes } from '@/server/db/schema'
import { truncate } from '@/lib/text'
import { DOCUMENT_FORMATS, type DocumentFormat } from '@/lib/document-formats'
import type { ResourceKind } from '@/server/search/types'

/**
 * §51 — The library is one list over three tables.
 *
 * A UNION in SQL keeps ordering and the row limit correct across types, which
 * fetching each table separately and merging in memory would not. Written as
 * raw SQL because the union of three differently-shaped selects is far clearer
 * this way than through the query builder.
 */
export type LibraryItem = {
  kind: ResourceKind
  id: string
  title: string
  excerpt: string | null
  date: Date
  projectId: string | null
  projectName: string | null
  status: string
  durationSeconds: number | null
  mimeType: string | null
}

export type LibraryFilters = {
  kinds?: ResourceKind[]
  projectId?: string | null
  limit?: number
  format?: DocumentFormat | null
}

type LibraryRow = {
  kind: ResourceKind
  id: string
  title: string
  excerpt: string | null
  date: string | Date
  project_id: string | null
  project_name: string | null
  status: string
  duration_seconds: number | string | null
  mime_type: string | null
}

export async function listLibrary(
  workspaceId: string,
  filters: LibraryFilters = {},
): Promise<LibraryItem[]> {
  const kinds = filters.kinds ?? ['document', 'note', 'meeting']
  const requestedLimit = filters.limit ?? 60
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.trunc(requestedLimit), 200)) : 60
  const params: unknown[] = [workspaceId]

  let projectClause = ''
  if (filters.projectId) {
    params.push(filters.projectId)
    projectClause = `AND r.project_id = $${params.length}`
  }

  const parts: string[] = []
  const format = DOCUMENT_FORMATS.find(option => option.value === filters.format)
  let formatClause = ''
  if (format) {
    params.push(format.mimeType)
    formatClause = `AND r.mime_type = $${params.length}`
  }

  if (kinds.includes('document')) {
    parts.push(`
      SELECT 'document' AS kind, r.id, r.title, r.summary AS excerpt, r.created_at AS date,
             r.project_id, p.name AS project_name, r.processing_status AS status,
             NULL::integer AS duration_seconds, r.mime_type
      FROM documents r LEFT JOIN projects p ON p.id = r.project_id AND p.workspace_id = r.workspace_id AND p.deleted_at IS NULL
      WHERE r.workspace_id = $1 AND r.deleted_at IS NULL ${projectClause} ${formatClause}`)
  }

  if (kinds.includes('note') && !format) {
    parts.push(`
      SELECT 'note' AS kind, r.id,
             CASE WHEN r.title = '' THEN 'Nota sin título' ELSE r.title END AS title,
             left(r.content, 240) AS excerpt, r.updated_at AS date,
             r.project_id, p.name AS project_name, 'completed' AS status, NULL::integer AS duration_seconds,
             NULL::text AS mime_type
      FROM notes r LEFT JOIN projects p ON p.id = r.project_id AND p.workspace_id = r.workspace_id AND p.deleted_at IS NULL
      WHERE r.workspace_id = $1 AND r.deleted_at IS NULL ${projectClause}`)
  }

  if (kinds.includes('meeting') && !format) {
    parts.push(`
      SELECT 'meeting' AS kind, r.id, r.title, NULL::text AS excerpt, r.meeting_date AS date,
             r.project_id, p.name AS project_name, r.status, r.duration_seconds, NULL::text AS mime_type
      FROM meetings r LEFT JOIN projects p ON p.id = r.project_id AND p.workspace_id = r.workspace_id AND p.deleted_at IS NULL
      WHERE r.workspace_id = $1 AND r.deleted_at IS NULL ${projectClause}`)
  }

  if (parts.length === 0) return []

  const rows = await rawQuery<LibraryRow>(
    `${parts.join('\nUNION ALL\n')} ORDER BY date DESC LIMIT ${limit}`,
    params,
  )

  return rows.map((row) => ({
    kind: row.kind,
    id: row.id,
    title: row.title,
    excerpt: row.excerpt ? truncate(row.excerpt.replace(/\s+/g, ' ').trim(), 180) : null,
    date: row.date instanceof Date ? row.date : new Date(row.date),
    projectId: row.project_id,
    projectName: row.project_name,
    status: row.status,
    durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds),
    mimeType: row.mime_type,
  }))
}

export async function getRecentActivity(workspaceId: string, limit = 6): Promise<LibraryItem[]> {
  return listLibrary(workspaceId, { limit })
}

export async function getLibraryCounts(workspaceId: string) {
  const db = await getDb()
  const [documentCount, noteCount, meetingCount] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(documents)
      .where(and(eq(documents.workspaceId, workspaceId), isNull(documents.deletedAt))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(notes)
      .where(and(eq(notes.workspaceId, workspaceId), isNull(notes.deletedAt))),
    db
      .select({ count: sql<number>`count(*)` })
      .from(meetings)
      .where(and(eq(meetings.workspaceId, workspaceId), isNull(meetings.deletedAt))),
  ])

  return {
    documents: Number(documentCount[0]?.count ?? 0),
    notes: Number(noteCount[0]?.count ?? 0),
    meetings: Number(meetingCount[0]?.count ?? 0),
  }
}

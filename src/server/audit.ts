import { getDb } from '@/server/db/client'
import { auditLogs } from '@/server/db/schema'

/**
 * §38 — Audit trail for sensitive actions.
 *
 * Metadata is limited to identifiers, counts and flags. Audio, transcripts and
 * document bodies never reach this table.
 */
export type AuditAction =
  | 'workspace_created'
  | 'workspace_deleted'
  | 'member_invited'
  | 'member_removed'
  | 'role_changed'
  | 'document_uploaded'
  | 'document_deleted'
  | 'note_deleted'
  | 'meeting_created'
  | 'meeting_deleted'
  | 'meeting_audio_deleted'
  | 'meeting_audio_downloaded'
  | 'account_deleted'
  | 'password_reset_requested'
  | 'password_reset_completed'

export async function recordAudit(entry: {
  action: AuditAction
  workspaceId?: string | null
  actorId?: string | null
  resourceType?: string | null
  resourceId?: string | null
  metadata?: Record<string, string | number | boolean | null>
}): Promise<void> {
  try {
    const db = await getDb()
    await db.insert(auditLogs).values({
      action: entry.action,
      workspaceId: entry.workspaceId ?? null,
      actorId: entry.actorId ?? null,
      resourceType: entry.resourceType ?? null,
      resourceId: entry.resourceId ?? null,
      metadata: entry.metadata ?? null,
    })
  } catch (err) {
    // Auditing must never break the operation it is recording.
    console.error('[knowhub] audit write failed', { action: entry.action, err })
  }
}

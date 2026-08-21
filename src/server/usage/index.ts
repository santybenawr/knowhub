import { and, eq, gte, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { documents, usageEvents } from '@/server/db/schema'
import { getPlanLimits, type PlanLimits } from '@/config/plans'

/**
 * §37/§141 — Usage accounting.
 *
 * Every billable action appends an immutable event; the dashboard aggregates
 * them for the current calendar month. Internal token counts are recorded for
 * capacity planning but are not surfaced in the UI.
 */
export type UsageType =
  | 'document_upload'
  | 'storage_bytes'
  | 'meeting_recorded'
  | 'meeting_audio_minutes'
  | 'transcription_minutes'
  | 'ai_query'
  | 'embedding_tokens'
  | 'generation_tokens'

export async function recordUsage(
  workspaceId: string,
  type: UsageType,
  quantity = 1,
  context?: { userId?: string | null; metadata?: Record<string, string | number | boolean> },
): Promise<void> {
  try {
    const db = await getDb()
    await db.insert(usageEvents).values({
      workspaceId,
      userId: context?.userId ?? null,
      type,
      quantity,
      metadata: context?.metadata ?? null,
    })
  } catch (err) {
    console.error('[knowhub] usage write failed', { type, err })
  }
}

export function startOfCurrentMonth(now = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export type UsageSummary = {
  plan: PlanLimits
  documents: number
  storageBytes: number
  aiQueries: number
  meetingMinutes: number
}

export async function getUsageSummary(workspaceId: string, plan: string): Promise<UsageSummary> {
  const db = await getDb()
  const since = startOfCurrentMonth()

  const monthly = await db
    .select({ type: usageEvents.type, total: sql<number>`coalesce(sum(${usageEvents.quantity}), 0)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.workspaceId, workspaceId), gte(usageEvents.createdAt, since)))
    .groupBy(usageEvents.type)

  const totals = new Map(monthly.map((r) => [r.type, Number(r.total)]))

  const docRows = await db
    .select({
      count: sql<number>`count(*)`,
      bytes: sql<number>`coalesce(sum(${documents.fileSize}), 0)`,
    })
    .from(documents)
    .where(and(eq(documents.workspaceId, workspaceId), sql`${documents.deletedAt} is null`))

  return {
    plan: getPlanLimits(plan),
    documents: Number(docRows[0]?.count ?? 0),
    storageBytes: Number(docRows[0]?.bytes ?? 0),
    aiQueries: totals.get('ai_query') ?? 0,
    meetingMinutes: Math.round((totals.get('meeting_audio_minutes') ?? 0) * 10) / 10,
  }
}

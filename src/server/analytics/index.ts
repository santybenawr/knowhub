import { getDb } from '@/server/db/client'
import { analyticsEvents } from '@/server/db/schema'

/**
 * §143 — Product analytics.
 *
 * Events carry counts and enums only. Titles, transcripts, questions and file
 * names are private content and are never sent here. The default sink is the
 * local `analytics_events` table; swapping in a vendor is a change to this one
 * function.
 */
export type AnalyticsEventName =
  | 'signup_completed'
  | 'onboarding_completed'
  | 'document_uploaded'
  | 'note_created'
  | 'meeting_created'
  | 'recording_started'
  | 'recording_paused'
  | 'recording_completed'
  | 'meeting_uploaded'
  | 'transcription_completed'
  | 'meeting_analysis_completed'
  | 'search_performed'
  | 'ai_question_sent'
  | 'meeting_question_sent'

export async function trackEvent(
  name: AnalyticsEventName,
  context: { workspaceId?: string | null; userId?: string | null },
  properties?: Record<string, string | number | boolean>,
): Promise<void> {
  try {
    const db = await getDb()
    await db.insert(analyticsEvents).values({
      name,
      workspaceId: context.workspaceId ?? null,
      userId: context.userId ?? null,
      properties: properties ?? null,
    })
  } catch (err) {
    console.error('[knowhub] analytics write failed', { name, err })
  }
}

import { z } from 'zod'

/**
 * §91/§92/§93 — Meeting analysis contract.
 *
 * `responsible` and `deadline` are nullable on purpose: the UI renders
 * "Responsable no especificado" / "Sin fecha definida" rather than letting the
 * model guess. Insight types that make a claim about the meeting must carry
 * `evidenceSegmentIds`, so every one of them can be traced back to audio.
 */

const evidenceIds = z.array(z.string()).default([])

const nullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null))

export const decisionSchema = z.object({
  text: z.string().min(1),
  evidenceSegmentIds: evidenceIds,
})

export const actionItemSchema = z.object({
  task: z.string().min(1),
  responsible: nullableString,
  deadline: nullableString,
  evidenceSegmentIds: evidenceIds,
})

export const keyPointSchema = z.object({
  text: z.string().min(1),
  evidenceSegmentIds: evidenceIds,
})

export const openQuestionSchema = z.object({
  text: z.string().min(1),
  evidenceSegmentIds: evidenceIds,
})

export const importantDateSchema = z.object({
  text: z.string().min(1),
  date: nullableString,
  evidenceSegmentIds: evidenceIds,
})

export const meetingAnalysisSchema = z.object({
  summary: z.string().default(''),
  topics: z.array(z.string()).default([]),
  participants: z.array(z.string()).default([]),
  decisions: z.array(decisionSchema).default([]),
  actionItems: z.array(actionItemSchema).default([]),
  keyPoints: z.array(keyPointSchema).default([]),
  openQuestions: z.array(openQuestionSchema).default([]),
  importantDates: z.array(importantDateSchema).default([]),
  suggestedQuestions: z.array(z.string()).default([]),
})

export type MeetingAnalysis = z.infer<typeof meetingAnalysisSchema>
export type Decision = z.infer<typeof decisionSchema>
export type ActionItem = z.infer<typeof actionItemSchema>
export type KeyPoint = z.infer<typeof keyPointSchema>
export type OpenQuestion = z.infer<typeof openQuestionSchema>
export type ImportantDate = z.infer<typeof importantDateSchema>

export const documentSummarySchema = z.object({
  summary: z.string().default(''),
  topics: z.array(z.string()).default([]),
})

export type DocumentSummary = z.infer<typeof documentSummarySchema>

/**
 * Drops evidence ids the model may have hallucinated, so a citation never
 * points at a segment that does not exist (§182).
 */
export function pruneAnalysisEvidence(
  analysis: MeetingAnalysis,
  validSegmentIds: Set<string>,
): MeetingAnalysis {
  const keep = (ids: string[]) => ids.filter((id) => validSegmentIds.has(id))
  return {
    ...analysis,
    decisions: analysis.decisions.map((d) => ({ ...d, evidenceSegmentIds: keep(d.evidenceSegmentIds) })),
    actionItems: analysis.actionItems.map((a) => ({ ...a, evidenceSegmentIds: keep(a.evidenceSegmentIds) })),
    keyPoints: analysis.keyPoints.map((k) => ({ ...k, evidenceSegmentIds: keep(k.evidenceSegmentIds) })),
    openQuestions: analysis.openQuestions.map((q) => ({ ...q, evidenceSegmentIds: keep(q.evidenceSegmentIds) })),
    importantDates: analysis.importantDates.map((d) => ({ ...d, evidenceSegmentIds: keep(d.evidenceSegmentIds) })),
  }
}

import { afterAll, describe, expect, it } from 'vitest'
import { closeDb, getDb } from '@/server/db/client'
import { meetings } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import {
  createMeeting,
  getAnalysis,
  getResolvedTranscript,
  importTranscript,
  renameSpeaker,
} from '@/server/meetings'
import { drainJobs } from '@/server/jobs'
import { search } from '@/server/search'
import { answerQuestion } from '@/server/ai/rag'
import { createTestTenant } from '../helpers/factories'
import { EXPECTED, OMEGA_TRANSCRIPT } from '../fixtures/transcript'

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

/**
 * §213 — The product test: capture a meeting, understand it, recall it, and
 * land back on the evidence with a real timestamp.
 */
describe('meeting pipeline', () => {
  it('turns an imported transcript into searchable, citable knowledge', async () => {
    const { access } = await createTestTenant()

    const meetingId = await createMeeting({
      access,
      title: 'Reunión Proyecto Omega',
      source: 'transcript_import',
    })

    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await drainJobs()

    // --- transcript: segments, speakers and timestamps -------------------
    const { segments, speakerLabels } = await getResolvedTranscript(meetingId, access.workspaceId)
    expect(segments.length).toBeGreaterThan(5)
    expect(segments[0]?.startSeconds).toBe(0)
    for (const segment of segments) {
      expect(segment.endSeconds).toBeGreaterThanOrEqual(segment.startSeconds)
    }
    for (const key of EXPECTED.speakers) {
      expect([...speakerLabels.keys()]).toContain(key)
    }

    // --- analysis: decisions and action items, each with evidence --------
    const analysis = await getAnalysis(meetingId, access.workspaceId)
    expect(analysis).not.toBeNull()

    const decisions = analysis?.decisions as Array<{ text: string; evidenceSegmentIds: string[] }>
    expect(decisions.length).toBeGreaterThan(0)
    expect(decisions.some((d) => d.text.toLowerCase().includes(EXPECTED.decisionContains.toLowerCase()))).toBe(true)

    const validIds = new Set(segments.map((s) => s.id))
    for (const decision of decisions) {
      expect(decision.evidenceSegmentIds.length).toBeGreaterThan(0)
      for (const id of decision.evidenceSegmentIds) expect(validIds.has(id)).toBe(true)
    }

    const actions = analysis?.actionItems as Array<{
      task: string
      responsible: string | null
      deadline: string | null
      evidenceSegmentIds: string[]
    }>
    const contactAction = actions.find((a) =>
      a.task.toLowerCase().includes(EXPECTED.actionContains.toLowerCase()),
    )
    expect(contactAction).toBeDefined()
    expect(contactAction?.responsible).toBe(EXPECTED.responsible)
    expect(contactAction?.evidenceSegmentIds.length).toBeGreaterThan(0)

    // --- meeting reaches `ready` and is indexed --------------------------
    const db = await getDb()
    const [row] = await db.select().from(meetings).where(eq(meetings.id, meetingId)).limit(1)
    expect(row?.status).toBe('ready')
    expect(row?.transcriptionStatus).toBe('completed')
    expect(row?.analysisStatus).toBe('completed')
    expect(row?.embeddingStatus).toBe('completed')

    // --- search finds the moment, with a real timestamp (§107/§184) ------
    const hits = await search({ workspaceId: access.workspaceId, query: 'proveedor B' })
    expect(hits.length).toBeGreaterThan(0)
    const meetingHit = hits.find((h) => h.kind === 'meeting')
    expect(meetingHit).toBeDefined()
    expect(meetingHit?.resourceId).toBe(meetingId)
    expect(meetingHit?.startSeconds).not.toBeNull()
    expect(meetingHit?.endSeconds).toBeGreaterThanOrEqual(meetingHit?.startSeconds ?? 0)

    // --- Ask answers with a citation that seeks the audio (§113) ---------
    const answer = await answerQuestion({
      workspaceId: access.workspaceId,
      question: '¿Qué decidimos sobre el proveedor?',
      scope: { type: 'meeting', meetingId, title: 'Reunión Proyecto Omega' },
    })
    expect(answer.usedEvidence).toBe(true)
    expect(answer.citations.length).toBeGreaterThan(0)
    const citation = answer.citations[0]
    expect(citation?.kind).toBe('meeting')
    expect(citation?.href).toMatch(/^\/meetings\/[0-9a-f-]+\?t=\d+$/)
    expect(citation?.startSeconds).not.toBeNull()
  })

  it('keeps a renamed speaker across re-processing and updates every display', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Reunión con renombrado' })

    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await renameSpeaker({ access, meetingId, speakerKey: 'SANTIAGO', displayName: 'Santiago Rojas' })

    const before = await getResolvedTranscript(meetingId, access.workspaceId)
    expect(before.speakerLabels.get('SANTIAGO')).toBe('Santiago Rojas')

    // Re-import: the transcript is replaced, the mapping is not lost (§80).
    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    const after = await getResolvedTranscript(meetingId, access.workspaceId)
    expect(after.speakerLabels.get('SANTIAGO')).toBe('Santiago Rojas')
    expect(after.segments[0]?.speakerLabel).toBe('Santiago Rojas')
  })

  it('does not duplicate transcript rows when processing runs twice', async () => {
    const { access } = await createTestTenant()
    const meetingId = await createMeeting({ access, title: 'Reunión idempotente' })

    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await drainJobs()
    const first = await getResolvedTranscript(meetingId, access.workspaceId)

    await importTranscript({ access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await drainJobs()
    const second = await getResolvedTranscript(meetingId, access.workspaceId)

    expect(second.segments.length).toBe(first.segments.length)
  })
})

import { afterAll, describe, expect, it } from 'vitest'
import { closeDb, getDb } from '@/server/db/client'
import { meetingChunks, meetingTranscriptSegments } from '@/server/db/schema'
import { eq } from 'drizzle-orm'
import {
  requireDocumentAccess,
  requireMeetingAccess,
  requireNoteAccess,
  requireWorkspaceAccess,
  assertProjectInWorkspace,
} from '@/server/permissions'
import { createMeeting, getAnalysis, getAudioUrl, getMeeting, importTranscript } from '@/server/meetings'
import { createNote } from '@/server/notes'
import { createProject } from '@/server/projects'
import { createDocumentFromUpload } from '@/server/documents'
import { search } from '@/server/search'
import { answerQuestion } from '@/server/ai/rag'
import { drainJobs } from '@/server/jobs'
import { isAppError } from '@/lib/errors'
import { createTestTenant } from '../helpers/factories'
import { OMEGA_TRANSCRIPT } from '../fixtures/transcript'

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

async function expectDenied(promise: Promise<unknown>): Promise<void> {
  await expect(promise).rejects.toSatisfy(
    (err: unknown) => isAppError(err) && (err.code === 'not_found' || err.code === 'forbidden'),
    'expected a not_found or forbidden AppError',
  )
}

/**
 * §150 — Mandatory multi-tenant isolation test.
 *
 * User B holds every real id belonging to User A — meeting, document, note,
 * project, workspace — and every access path must refuse. "Not found" rather
 * than "forbidden" is intentional: a non-member should not be able to confirm
 * that an id exists.
 */
describe('multi-tenant isolation', () => {
  it('denies user B every route into user A data', async () => {
    const alice = await createTestTenant({ name: 'Alice' })
    const bob = await createTestTenant({ name: 'Bob' })

    // --- Alice fills her workspace ---------------------------------------
    const meetingId = await createMeeting({
      access: alice.access,
      title: 'Reunión confidencial de Alice',
    })
    await importTranscript({ access: alice.access, meetingId, transcript: OMEGA_TRANSCRIPT })

    const noteId = await createNote({
      access: alice.access,
      title: 'Nota privada de Alice',
      content: 'El presupuesto confidencial del proyecto es de 250 millones.',
    })

    const projectId = await createProject({ access: alice.access, name: 'Proyecto de Alice' })

    const { documentId } = await createDocumentFromUpload({
      access: alice.access,
      buffer: Buffer.from('Documento interno de Alice sobre el proveedor B.', 'utf8'),
      filename: 'alice.txt',
      declaredMime: 'text/plain',
    })

    await drainJobs()

    // Alice can reach her own data.
    await expect(requireMeetingAccess(alice.user.id, meetingId)).resolves.toBeTruthy()
    await expect(getMeeting(meetingId, alice.access.workspaceId)).resolves.toBeTruthy()

    // --- Bob cannot, through any door ------------------------------------
    await expectDenied(requireWorkspaceAccess(bob.user.id, alice.access.workspaceId))
    await expectDenied(requireMeetingAccess(bob.user.id, meetingId))
    await expectDenied(requireDocumentAccess(bob.user.id, documentId))
    await expectDenied(requireNoteAccess(bob.user.id, noteId))
    await expectDenied(assertProjectInWorkspace(projectId, bob.access.workspaceId))

    // Reading through the service layer with a forged workspace id.
    await expectDenied(getMeeting(meetingId, bob.access.workspaceId))
    await expectDenied(getAudioUrl(meetingId, bob.access))

    // Analysis and transcript rows are scoped by workspace, not just by id.
    await expect(getAnalysis(meetingId, bob.access.workspaceId)).resolves.toBeNull()

    const db = await getDb()
    const bobSegments = await db
      .select()
      .from(meetingTranscriptSegments)
      .where(eq(meetingTranscriptSegments.workspaceId, bob.access.workspaceId))
    expect(bobSegments).toHaveLength(0)

    const bobChunks = await db
      .select()
      .from(meetingChunks)
      .where(eq(meetingChunks.workspaceId, bob.access.workspaceId))
    expect(bobChunks).toHaveLength(0)
  })

  it('never surfaces another workspace in search results', async () => {
    const alice = await createTestTenant({ name: 'Alice2' })
    const bob = await createTestTenant({ name: 'Bob2' })

    const meetingId = await createMeeting({ access: alice.access, title: 'Omega secreto' })
    await importTranscript({ access: alice.access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await createNote({
      access: alice.access,
      title: 'Proveedor',
      content: 'Seleccionamos el proveedor B por sus condiciones de soporte.',
    })
    await drainJobs()

    // Alice finds it.
    const aliceHits = await search({ workspaceId: alice.access.workspaceId, query: 'proveedor B' })
    expect(aliceHits.length).toBeGreaterThan(0)

    // Bob, searching the same words, gets nothing.
    const bobHits = await search({ workspaceId: bob.access.workspaceId, query: 'proveedor B' })
    expect(bobHits).toHaveLength(0)
  })

  it('never leaks another workspace through Ask', async () => {
    const alice = await createTestTenant({ name: 'Alice3' })
    const bob = await createTestTenant({ name: 'Bob3' })

    const meetingId = await createMeeting({ access: alice.access, title: 'Omega privado' })
    await importTranscript({ access: alice.access, meetingId, transcript: OMEGA_TRANSCRIPT })
    await drainJobs()

    const aliceAnswer = await answerQuestion({
      workspaceId: alice.access.workspaceId,
      question: '¿Qué proveedor elegimos?',
      scope: { type: 'workspace' },
    })
    expect(aliceAnswer.usedEvidence).toBe(true)

    // Even scoped explicitly at Alice's meeting id, Bob's workspace has no
    // matching chunks, so retrieval comes back empty and no answer is produced.
    const bobAnswer = await answerQuestion({
      workspaceId: bob.access.workspaceId,
      question: '¿Qué proveedor elegimos?',
      scope: { type: 'meeting', meetingId, title: 'Omega privado' },
    })
    expect(bobAnswer.usedEvidence).toBe(false)
    expect(bobAnswer.citations).toHaveLength(0)
    expect(bobAnswer.answer).toContain('No encontré suficiente información')
  })
})

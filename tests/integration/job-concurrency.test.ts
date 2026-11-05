import { randomUUID } from 'node:crypto'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { aiJobs } from '@/server/db/schema'
import { enqueueAndRun, enqueueJob, getJobsForResource, registerJobHandlers, runJob, waitForInflightJobs } from '@/server/jobs'
import { createTestTenant } from '../helpers/factories'

afterAll(async () => { await waitForInflightJobs(); await closeDb() })

async function fixture() {
  const { access } = await createTestTenant()
  return {
    workspaceId: access.workspaceId,
    resourceId: randomUUID(),
    resourceType: 'document' as const,
    type: 'document_embedding' as const,
  }
}

describe('atomic queue scheduling and recovery', () => {
  it('deduplicates concurrent enqueues and claims', async () => {
    const input = await fixture()
    const handler = vi.fn().mockResolvedValue(undefined)
    registerJobHandlers({ document_embedding: handler })
    const ids = await Promise.all(Array.from({ length: 8 }, () => enqueueJob(input)))
    expect(new Set(ids).size).toBe(1)
    expect(await getJobsForResource(input.resourceId)).toHaveLength(1)
    const outcomes = await Promise.all(ids.map(id => runJob(id!)))
    expect(outcomes.filter(outcome => outcome === 'completed')).toHaveLength(1)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('recovers an abandoned processing job when explicitly retried without drainJobs', async () => {
    const input = await fixture()
    const id = await enqueueJob(input)
    const db = await getDb()
    await db.update(aiJobs).set({
      status: 'processing', attemptCount: 1, startedAt: new Date(Date.now() - 16 * 60 * 1000),
    }).where(eq(aiJobs.id, id!))
    const handler = vi.fn().mockResolvedValue(undefined)
    registerJobHandlers({ document_embedding: handler })
    expect(await enqueueAndRun(input)).toBe(id)
    await waitForInflightJobs()
    expect(handler).toHaveBeenCalledOnce()
    expect((await getJobsForResource(input.resourceId))[0]).toMatchObject({ status: 'completed', attemptCount: 2 })
  })

  it('retires an abandoned exhausted job and lets an explicit retry start fresh', async () => {
    const input = await fixture()
    const id = await enqueueJob(input)
    const db = await getDb()
    await db.update(aiJobs).set({
      status: 'processing', attemptCount: 3, startedAt: new Date(Date.now() - 16 * 60 * 1000),
    }).where(eq(aiJobs.id, id!))
    const handler = vi.fn().mockResolvedValue(undefined)
    registerJobHandlers({ document_embedding: handler })
    const next = await enqueueAndRun(input)
    expect(next).not.toBe(id)
    await waitForInflightJobs()
    const jobs = await getJobsForResource(input.resourceId)
    expect(jobs.find(job => job.id === id)?.status).toBe('failed')
    expect(jobs.find(job => job.id === next)).toMatchObject({ status: 'completed', attemptCount: 1 })
    expect(handler).toHaveBeenCalledOnce()
  })

  it('does not run a second handler while the first attempt is still alive', async () => {
    const input = await fixture()
    let release!: () => void
    let entered!: () => void
    const started = new Promise<void>(resolve => { entered = resolve })
    const gate = new Promise<void>(resolve => { release = resolve })
    const handler = vi.fn(async () => { entered(); await gate })
    registerJobHandlers({ document_embedding: handler })
    const id = await enqueueAndRun(input)
    await started
    try {
      const db = await getDb()
      await db.update(aiJobs).set({ startedAt: new Date(Date.now() - 16 * 60 * 1000) })
        .where(eq(aiJobs.id, id!))
      expect(await enqueueAndRun(input)).toBe(id)
      expect(handler).toHaveBeenCalledOnce()
    } finally {
      release()
    }
    await waitForInflightJobs()
    expect(handler).toHaveBeenCalledOnce()
  })

  it('reclaims an interrupted note through its existing follow-up instead of duplicating pending work', async () => {
    const base = await fixture()
    const input = { ...base, resourceType: 'note' as const, type: 'note_embedding' as const }
    const first = await enqueueJob(input)
    const db = await getDb()
    await db.update(aiJobs).set({ status: 'processing', attemptCount: 1, startedAt: new Date() })
      .where(eq(aiJobs.id, first!))
    const followUp = await enqueueJob(input)
    expect(followUp).not.toBe(first)
    await db.update(aiJobs).set({ startedAt: new Date(Date.now() - 16 * 60 * 1000) })
      .where(eq(aiJobs.id, first!))
    expect(await enqueueJob(input)).toBe(followUp)
    const jobs = await getJobsForResource(input.resourceId)
    expect(jobs.filter(job => job.status === 'pending')).toHaveLength(1)
    expect(jobs.find(job => job.id === first)?.status).toBe('failed')
    // Complete the synthetic fixture so it cannot enter another test's queue.
    await db.update(aiJobs).set({ status: 'completed' }).where(eq(aiJobs.id, followUp!))
  })
})

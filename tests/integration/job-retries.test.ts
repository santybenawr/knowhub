import { afterAll, expect, it, vi } from 'vitest'
import { randomUUID } from 'node:crypto'
import { closeDb } from '@/server/db/client'
import { drainJobs, enqueueAndRun, enqueueJob, getJobsForResource, registerJobHandlers, waitForInflightJobs } from '@/server/jobs'
import { validation } from '@/lib/errors'
import { createTestTenant } from '../helpers/factories'

afterAll(async () => { await waitForInflightJobs(); await closeDb() })

async function input() {
  const { access } = await createTestTenant()
  return { workspaceId: access.workspaceId, resourceId: randomUUID(), resourceType: 'note' as const, type: 'note_embedding' as const }
}

it('drains a job that fails transiently on its first attempt', async () => {
  const handler = vi.fn().mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue(undefined)
  registerJobHandlers({ note_embedding: handler })
  const job = await input()
  await enqueueJob(job)
  await drainJobs()
  expect(handler).toHaveBeenCalledTimes(2)
  expect((await getJobsForResource(job.resourceId))[0]).toMatchObject({ status: 'completed', attemptCount: 2 })
})

it('retries background work without a separate drain call', async () => {
  const handler = vi.fn().mockRejectedValueOnce(new Error('Temporary failure')).mockResolvedValue(undefined)
  registerJobHandlers({ note_embedding: handler })
  const job = await input()
  await enqueueAndRun(job)
  await waitForInflightJobs()
  expect(handler).toHaveBeenCalledTimes(2)
  expect((await getJobsForResource(job.resourceId))[0]?.status).toBe('completed')
})

it('stops after the attempt limit for persistent failures', async () => {
  const handler = vi.fn().mockRejectedValue(new Error('Unavailable'))
  registerJobHandlers({ note_embedding: handler })
  const job = await input()
  await enqueueAndRun(job)
  await waitForInflightJobs()
  expect(handler).toHaveBeenCalledTimes(3)
  expect((await getJobsForResource(job.resourceId))[0]).toMatchObject({ status: 'failed', attemptCount: 3 })
})

it('does not retry a validation rejection', async () => {
  const handler = vi.fn().mockRejectedValue(validation('Unsupported file'))
  registerJobHandlers({ note_embedding: handler })
  const job = await input()
  await enqueueAndRun(job)
  await waitForInflightJobs()
  expect(handler).toHaveBeenCalledOnce()
  expect((await getJobsForResource(job.resourceId))[0]?.status).toBe('failed')
})

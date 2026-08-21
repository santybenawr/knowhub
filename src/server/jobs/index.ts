import { and, eq, inArray, lt, or, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { aiJobs, type JobType } from '@/server/db/schema'
import { isAppError } from '@/lib/errors'
import type { JobHandler, JobRegistry } from './types'

export * from './types'

/**
 * §87 — Background processing.
 *
 * A table, a claim query and an in-process runner. Transcription and analysis
 * take minutes, so they must not hold an HTTP request open; they do not need a
 * broker and a cluster either. Jobs are claimed with a conditional UPDATE, so
 * two runners cannot pick up the same row.
 */

const MAX_ATTEMPTS = 3
const STALE_AFTER_MS = 15 * 60 * 1000

let registry: JobRegistry = {}

/**
 * Jobs started in the background are tracked so callers can wait for the queue
 * to settle — Next.js `after()` needs the promise to keep the invocation alive,
 * and tests need a deterministic point at which processing is finished.
 */
const inflight = new Set<Promise<unknown>>()

function track(promise: Promise<unknown>): void {
  inflight.add(promise)
  void promise.finally(() => inflight.delete(promise))
}

export async function waitForInflightJobs(): Promise<void> {
  while (inflight.size > 0) {
    await Promise.allSettled([...inflight])
  }
}

export function registerJobHandlers(handlers: JobRegistry): void {
  registry = { ...registry, ...handlers }
}

/**
 * §130 — Enqueuing the same work twice is a no-op while the first attempt is
 * still outstanding, so a double-click cannot produce duplicate transcripts.
 */
export async function enqueueJob(input: {
  workspaceId: string
  resourceType: 'document' | 'note' | 'meeting'
  resourceId: string
  type: JobType
}): Promise<string | null> {
  const db = await getDb()

  const existing = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(
      and(
        eq(aiJobs.resourceId, input.resourceId),
        eq(aiJobs.type, input.type),
        inArray(aiJobs.status, ['pending', 'processing']),
      ),
    )
    .limit(1)
  if (existing[0]) return existing[0].id

  const rows = await db
    .insert(aiJobs)
    .values({
      workspaceId: input.workspaceId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      type: input.type,
    })
    .returning({ id: aiJobs.id })

  return rows[0]?.id ?? null
}

/**
 * Enqueue and start working without blocking the caller.
 *
 * The work is handed to Next's `after()` when there is a request to attach to.
 * A bare floating promise is not enough in production: once the response is
 * sent the runtime is free to tear the invocation down, and the job would sit
 * at `pending` forever. Outside a request (scripts, tests, the dev worker)
 * `after()` is unavailable and the tracked promise is the right mechanism —
 * `drainJobs()` waits on it.
 */
export async function enqueueAndRun(input: {
  workspaceId: string
  resourceType: 'document' | 'note' | 'meeting'
  resourceId: string
  type: JobType
}): Promise<string | null> {
  const jobId = await enqueueJob(input)
  if (!jobId) return jobId

  const work = runJobSafely(jobId)
  track(work)

  try {
    const { after } = await import('next/server')
    after(work)
  } catch {
    // Not inside a Next request scope; the tracked promise carries it.
  }

  return jobId
}

async function runJobSafely(jobId: string): Promise<void> {
  try {
    await runJob(jobId)
  } catch (err) {
    console.error('[knowhub] job runner crashed', { jobId, err })
  }
}

export async function runJob(jobId: string): Promise<'completed' | 'failed' | 'skipped'> {
  const db = await getDb()

  // Atomic claim: only one runner can move a job out of `pending`.
  const claimed = await db
    .update(aiJobs)
    .set({ status: 'processing', startedAt: new Date(), attemptCount: sql`${aiJobs.attemptCount} + 1` })
    .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'pending')))
    .returning({
      id: aiJobs.id,
      workspaceId: aiJobs.workspaceId,
      resourceId: aiJobs.resourceId,
      type: aiJobs.type,
      attemptCount: aiJobs.attemptCount,
    })

  const job = claimed[0]
  if (!job) return 'skipped'

  const handler: JobHandler | undefined = registry[job.type]
  if (!handler) {
    await db
      .update(aiJobs)
      .set({ status: 'failed', error: `No hay handler registrado para ${job.type}.`, completedAt: new Date() })
      .where(eq(aiJobs.id, job.id))
    return 'failed'
  }

  try {
    await handler({
      jobId: job.id,
      workspaceId: job.workspaceId,
      resourceId: job.resourceId,
      attempt: job.attemptCount,
    })
    await db
      .update(aiJobs)
      .set({ status: 'completed', error: null, completedAt: new Date() })
      .where(eq(aiJobs.id, job.id))
    return 'completed'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // §131 — a rejected format or an oversized file will fail identically on
    // every retry; only transient failures are worth queuing again.
    const retryable = isRetryable(err) && job.attemptCount < MAX_ATTEMPTS
    await db
      .update(aiJobs)
      .set({
        status: retryable ? 'pending' : 'failed',
        error: message.slice(0, 2000),
        completedAt: retryable ? null : new Date(),
      })
      .where(eq(aiJobs.id, job.id))
    console.error('[knowhub] job failed', { jobId: job.id, type: job.type, retryable, message })
    return retryable ? 'skipped' : 'failed'
  }
}

function isRetryable(err: unknown): boolean {
  if (isAppError(err)) {
    return err.code === 'provider_error' || err.code === 'internal'
  }
  return true
}

/** One pass over the pending queue. */
export async function processPendingJobs(limit = 20): Promise<number> {
  const db = await getDb()
  await releaseStaleJobs()
  const pending = await db
    .select({ id: aiJobs.id })
    .from(aiJobs)
    .where(eq(aiJobs.status, 'pending'))
    .orderBy(aiJobs.createdAt)
    .limit(limit)

  let processed = 0
  for (const job of pending) {
    const result = await runJob(job.id)
    if (result !== 'skipped') processed++
  }
  return processed
}

/**
 * Runs until the queue is empty and nothing is in flight. Handlers enqueue
 * follow-up stages (transcription -> analysis -> indexing), so a single pass is
 * not enough to reach a settled state.
 */
export async function drainJobs(maxRounds = 12): Promise<void> {
  for (let round = 0; round < maxRounds; round++) {
    await waitForInflightJobs()
    const processed = await processPendingJobs()
    if (processed === 0 && inflight.size === 0) return
  }
}

/** A process that dies mid-job leaves a row in `processing`; reclaim it. */
async function releaseStaleJobs(): Promise<void> {
  const db = await getDb()
  await db
    .update(aiJobs)
    .set({ status: 'pending' })
    .where(
      and(
        eq(aiJobs.status, 'processing'),
        or(lt(aiJobs.startedAt, new Date(Date.now() - STALE_AFTER_MS)), sql`${aiJobs.startedAt} is null`),
        lt(aiJobs.attemptCount, MAX_ATTEMPTS),
      ),
    )
}

export async function getJobsForResource(resourceId: string) {
  const db = await getDb()
  return db.select().from(aiJobs).where(eq(aiJobs.resourceId, resourceId)).orderBy(aiJobs.createdAt)
}

import { and, eq, gte, inArray, lt, notInArray, or, sql } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { aiJobs, workspaces, type JobType } from '@/server/db/schema'
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
const activeJobs = new Set<string>()

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
 * §130 — Enqueuing the same work twice reuses pending work. Mutable notes may
 * retain one follow-up while their current snapshot is already processing.
 */
export async function enqueueJob(input: {
  workspaceId: string
  resourceType: 'document' | 'note' | 'meeting'
  resourceId: string
  type: JobType
}): Promise<string | null> {
  const db = await getDb()

  return db.transaction(async (tx) => {
    // A short row lock serializes enqueue/claim across server instances. The
    // external provider is never called while holding this workspace lock.
    await tx.select({ id: workspaces.id }).from(workspaces)
      .where(eq(workspaces.id, input.workspaceId)).for('update')

    await releaseStaleJobs(input.resourceId, tx)
    const existing = await tx.select({ id: aiJobs.id, status: aiJobs.status })
      .from(aiJobs)
      .where(and(
        eq(aiJobs.workspaceId, input.workspaceId),
        eq(aiJobs.resourceType, input.resourceType),
        eq(aiJobs.resourceId, input.resourceId),
        eq(aiJobs.type, input.type),
        inArray(aiJobs.status, ['pending', 'processing']),
      ))
      .orderBy(aiJobs.createdAt)

    // A note can change while its current snapshot is being embedded. Keep
    // one follow-up, and let every later edit coalesce into that pending job.
    const reusable = input.type === 'note_embedding'
      ? existing.find(job => job.status === 'pending')
      : existing[0]
    if (reusable) return reusable.id

    const rows = await tx.insert(aiJobs).values(input).returning({ id: aiJobs.id })
    return rows[0]?.id ?? null
  })
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
    let currentId: string | undefined = jobId
    while (currentId) {
      const result = await runJob(currentId)
      if (result === 'retry') {
        await new Promise(resolve => setTimeout(resolve, 500))
        continue
      }
      if (result === 'skipped') return

      // A request that queued a note edit may have found the previous runner
      // busy. Continue it here, inside the same awaited after() lifetime.
      const db = await getDb()
      const [finished] = await db.select().from(aiJobs).where(eq(aiJobs.id, currentId))
      if (finished?.type !== 'note_embedding') return
      const [next] = await db.select({ id: aiJobs.id }).from(aiJobs).where(and(
        eq(aiJobs.workspaceId, finished.workspaceId),
        eq(aiJobs.resourceId, finished.resourceId),
        eq(aiJobs.type, 'note_embedding'),
        eq(aiJobs.status, 'pending'),
      )).orderBy(aiJobs.createdAt).limit(1)
      currentId = next?.id
    }
  } catch (err) {
    console.error('[knowhub] job runner crashed', { jobId, err })
  }
}

export async function runJob(jobId: string): Promise<'completed' | 'failed' | 'skipped' | 'retry'> {
  const db = await getDb()

  if (activeJobs.has(jobId)) return 'skipped'
  const [requested] = await db.select().from(aiJobs).where(eq(aiJobs.id, jobId))
  if (!requested) return 'skipped'

  const job = await db.transaction(async (tx) => {
    await tx.select({ id: workspaces.id }).from(workspaces)
      .where(eq(workspaces.id, requested.workspaceId)).for('update')
    await releaseStaleJobs(requested.resourceId, tx)
    const [running] = await tx.select({ id: aiJobs.id }).from(aiJobs).where(and(
      eq(aiJobs.workspaceId, requested.workspaceId),
      eq(aiJobs.resourceId, requested.resourceId),
      eq(aiJobs.type, requested.type),
      eq(aiJobs.status, 'processing'),
    )).limit(1)
    if (running) return undefined

    const [claimed] = await tx.update(aiJobs)
      .set({ status: 'processing', startedAt: new Date(), completedAt: null, attemptCount: sql`${aiJobs.attemptCount} + 1` })
      .where(and(eq(aiJobs.id, jobId), eq(aiJobs.status, 'pending'), lt(aiJobs.attemptCount, MAX_ATTEMPTS)))
      .returning()
    return claimed
  })
  if (!job) return 'skipped'
  // A reclaimed attempt cannot be overwritten by its old runner's completion.
  const ownsAttempt = and(
    eq(aiJobs.id, job.id), eq(aiJobs.status, 'processing'), eq(aiJobs.attemptCount, job.attemptCount),
  )

  const handler: JobHandler | undefined = registry[job.type]
  if (!handler) {
    await db
      .update(aiJobs)
      .set({ status: 'failed', error: `No hay handler registrado para ${job.type}.`, completedAt: new Date() })
      .where(ownsAttempt)
    return 'failed'
  }

  activeJobs.add(job.id)
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
      .where(ownsAttempt)
    return 'completed'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // §131 — a rejected format or an oversized file will fail identically on
    // every retry; only transient failures are worth queuing again.
    const retryable = await db.transaction(async (tx) => {
      await tx.select({ id: workspaces.id }).from(workspaces)
        .where(eq(workspaces.id, job.workspaceId)).for('update')
      const [followUp] = job.type === 'note_embedding'
        ? await tx.select({ id: aiJobs.id }).from(aiJobs).where(and(
          eq(aiJobs.workspaceId, job.workspaceId), eq(aiJobs.resourceId, job.resourceId),
          eq(aiJobs.type, job.type), eq(aiJobs.status, 'pending'),
        )).limit(1)
        : []
      const retry = !followUp && isRetryable(err) && job.attemptCount < MAX_ATTEMPTS
      await tx.update(aiJobs).set({
        status: retry ? 'pending' : 'failed',
        error: message.slice(0, 2000),
        completedAt: retry ? null : new Date(),
      }).where(ownsAttempt)
      return retry
    })
    console.error('[knowhub] job failed', { jobId: job.id, type: job.type, retryable, message })
    // A real attempted job must not look like an empty queue to drainJobs.
    return retryable ? 'retry' : 'failed'
  } finally {
    activeJobs.delete(job.id)
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
async function releaseStaleJobs(
  resourceId?: string,
  executor?: Pick<Awaited<ReturnType<typeof getDb>>, 'update'>,
): Promise<void> {
  const db = executor ?? await getDb()
  const stale = and(
    eq(aiJobs.status, 'processing'),
    resourceId ? eq(aiJobs.resourceId, resourceId) : undefined,
    or(lt(aiJobs.startedAt, new Date(Date.now() - STALE_AFTER_MS)), sql`${aiJobs.startedAt} is null`),
    activeJobs.size > 0 ? notInArray(aiJobs.id, [...activeJobs]) : undefined,
  )
  // A later note snapshot already covers abandoned work; do not turn it into
  // a second pending attempt when reclaiming the interrupted predecessor.
  await db.update(aiJobs).set({
    status: 'failed', completedAt: new Date(),
    error: 'El procesamiento interrumpido fue sustituido por una edición más reciente.',
  }).where(and(stale, eq(aiJobs.type, 'note_embedding'), sql`exists (
    select 1 from ai_jobs queued
    where queued.workspace_id = ai_jobs.workspace_id
      and queued.resource_id = ai_jobs.resource_id
      and queued.type = ai_jobs.type and queued.status = 'pending'
  )`))
  await db.update(aiJobs).set({ status: 'pending', completedAt: null })
    .where(and(stale, lt(aiJobs.attemptCount, MAX_ATTEMPTS)))
  await db.update(aiJobs).set({
    status: 'failed', completedAt: new Date(),
    error: 'El procesamiento se interrumpió. Puedes volver a intentarlo.',
  }).where(and(stale, gte(aiJobs.attemptCount, MAX_ATTEMPTS)))
}

export async function getJobsForResource(resourceId: string) {
  const db = await getDb()
  return db.select().from(aiJobs).where(eq(aiJobs.resourceId, resourceId)).orderBy(aiJobs.createdAt)
}

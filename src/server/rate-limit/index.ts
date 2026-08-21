import { and, eq, lt, sql } from 'drizzle-orm'
import { getServerEnv } from '@/config/env'
import { getDb } from '@/server/db/client'
import { rateLimits } from '@/server/db/schema'
import { rateLimited } from '@/lib/errors'

/**
 * §132 — Fixed-window rate limiting, backed by the database.
 *
 * A window row is upserted and incremented atomically, so concurrent requests
 * cannot both read a stale count. Deliberately not Redis: one more service to
 * run for a limiter that guards a handful of endpoints.
 */

export type RateLimitRule = { limit: number; windowSeconds: number }

export const RATE_LIMITS = {
  login: { limit: 10, windowSeconds: 300 },
  signup: { limit: 5, windowSeconds: 3600 },
  passwordReset: { limit: 5, windowSeconds: 3600 },
  documentUpload: { limit: 30, windowSeconds: 3600 },
  meetingCreate: { limit: 60, windowSeconds: 3600 },
  audioUpload: { limit: 30, windowSeconds: 3600 },
  transcription: { limit: 30, windowSeconds: 3600 },
  reanalyze: { limit: 20, windowSeconds: 3600 },
  search: { limit: 120, windowSeconds: 60 },
  ask: { limit: 60, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>

export type RateLimitName = keyof typeof RATE_LIMITS

export function windowStartFor(windowSeconds: number, now = Date.now()): Date {
  const ms = windowSeconds * 1000
  return new Date(Math.floor(now / ms) * ms)
}

export async function consumeRateLimit(
  name: RateLimitName,
  identifier: string,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const rule = RATE_LIMITS[name]
  const limit = rule.limit * getServerEnv().RATE_LIMIT_MULTIPLIER
  const bucket = `${name}:${identifier}`
  const windowStart = windowStartFor(rule.windowSeconds)
  const db = await getDb()

  const rows = await db
    .insert(rateLimits)
    .values({ bucket, windowStart, count: 1 })
    .onConflictDoUpdate({
      target: [rateLimits.bucket, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count })

  const count = rows[0]?.count ?? 1
  const resetAt = new Date(windowStart.getTime() + rule.windowSeconds * 1000)

  // Opportunistic cleanup of windows that can no longer be hit.
  if (count === 1) {
    await db
      .delete(rateLimits)
      .where(and(eq(rateLimits.bucket, bucket), lt(rateLimits.windowStart, windowStart)))
  }

  return { allowed: count <= limit, remaining: Math.max(0, limit - count), resetAt }
}

/** Throws `AppError('rate_limited')` when the caller is over the limit. */
export async function enforceRateLimit(name: RateLimitName, identifier: string): Promise<void> {
  const result = await consumeRateLimit(name, identifier)
  if (!result.allowed) {
    const seconds = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))
    throw rateLimited(`Demasiadas solicitudes. Intenta de nuevo en ${seconds} segundos.`)
  }
}

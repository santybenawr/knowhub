import { cookies } from 'next/headers'
import { and, eq, gt, isNull, lt } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { sessions, users, workspaceMembers, workspaces } from '@/server/db/schema'
import { generateToken, hashToken } from '@/lib/crypto'
import { unauthenticated } from '@/lib/errors'
import { assertServerOnly } from '@/server/assert-server'
import { shouldUseSecureCookies } from './cookie'

assertServerOnly('server/auth/session')

export const SESSION_COOKIE = 'knowhub_session'
const SESSION_TTL_DAYS = 30

export type SessionUser = {
  id: string
  email: string
  name: string
  avatarUrl: string | null
  timezone: string
  themePreference: string
  onboardingCompletedAt: Date | null
  recordingConsentAt: Date | null
  lastWorkspaceId: string | null
}

/**
 * Opaque, database-backed sessions.
 *
 * A random token lives in an httpOnly cookie; only its SHA-256 is stored, so a
 * database dump cannot be replayed as a login. Revocation is a DELETE.
 */
export async function createSession(userId: string, userAgent?: string | null): Promise<void> {
  const db = await getDb()
  const token = generateToken(32)
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 86_400_000)

  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    userAgent: userAgent?.slice(0, 255) ?? null,
    expiresAt,
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: shouldUseSecureCookies(),
    path: '/',
    expires: expiresAt,
  })

  // Opportunistic cleanup; cheap and keeps the table from growing forever.
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()))
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    const db = await getDb()
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)))
  }
  store.delete(SESSION_COOKIE)
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  const db = await getDb()
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      timezone: users.timezone,
      themePreference: users.themePreference,
      onboardingCompletedAt: users.onboardingCompletedAt,
      recordingConsentAt: users.recordingConsentAt,
      lastWorkspaceId: users.lastWorkspaceId,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1)

  return rows[0] ?? null
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthenticated()
  return user
}

export type ActiveWorkspace = {
  id: string
  name: string
  slug: string
  type: string
  plan: string
  role: string
}

/**
 * Resolves the workspace the request operates on: an explicit id when the
 * caller is a member of it, otherwise their last used one, otherwise the
 * first they belong to. Never trusts the requested id blindly.
 */
export async function resolveWorkspace(
  userId: string,
  requestedId?: string | null,
): Promise<ActiveWorkspace | null> {
  const db = await getDb()
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
      plan: workspaces.plan,
      role: workspaceMembers.role,
      createdAt: workspaces.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .orderBy(workspaces.createdAt)

  if (rows.length === 0) return null
  const byId = (id: string | null | undefined) => rows.find((r) => r.id === id)
  const chosen = byId(requestedId) ?? byId(await lastWorkspaceIdOf(userId)) ?? rows[0]
  if (!chosen) return null
  return {
    id: chosen.id,
    name: chosen.name,
    slug: chosen.slug,
    type: chosen.type,
    plan: chosen.plan,
    role: chosen.role,
  }
}

async function lastWorkspaceIdOf(userId: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db
    .select({ lastWorkspaceId: users.lastWorkspaceId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return rows[0]?.lastWorkspaceId ?? null
}

export async function listWorkspacesForUser(userId: string): Promise<ActiveWorkspace[]> {
  const db = await getDb()
  const rows = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
      plan: workspaces.plan,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.userId, userId), isNull(workspaces.deletedAt)))
    .orderBy(workspaces.createdAt)
  return rows
}

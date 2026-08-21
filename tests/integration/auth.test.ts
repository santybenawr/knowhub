import { afterAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { userCredentials, users, workspaceMembers, workspaces } from '@/server/db/schema'
import {
  createPasswordResetToken,
  ensurePersonalWorkspace,
  login,
  resetPassword,
  signup,
} from '@/server/auth/service'
import { hashPassword, verifyPassword } from '@/lib/crypto'
import { consumeRateLimit, windowStartFor } from '@/server/rate-limit'
import { drainJobs } from '@/server/jobs'

afterAll(async () => {
  await drainJobs()
  await closeDb()
})

const PASSWORD = 'contrasena-segura-9'

/** §41/§42 — Signup is transactional and always leaves a usable workspace. */
describe('signup', () => {
  it('creates the user, their credentials, a personal workspace and an OWNER membership', async () => {
    const email = `signup-${Date.now()}@knowhub.test`
    const { userId, workspaceId } = await signup({ name: 'Santiago Rojas', email, password: PASSWORD })

    const db = await getDb()
    const [user] = await db.select().from(users).where(eq(users.id, userId))
    expect(user?.email).toBe(email)
    expect(user?.lastWorkspaceId).toBe(workspaceId)

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, workspaceId))
    expect(workspace?.type).toBe('personal')
    expect(workspace?.ownerId).toBe(userId)
    expect(workspace?.name).toContain('Santiago')

    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    expect(membership?.role).toBe('OWNER')
  })

  it('never stores the password in plain text', async () => {
    const email = `hash-${Date.now()}@knowhub.test`
    const { userId } = await signup({ name: 'Laura', email, password: PASSWORD })

    const db = await getDb()
    const [credentials] = await db.select().from(userCredentials).where(eq(userCredentials.userId, userId))
    expect(credentials?.passwordHash).toBeDefined()
    expect(credentials?.passwordHash).not.toContain(PASSWORD)
    expect(credentials?.passwordHash.startsWith('scrypt$')).toBe(true)
  })

  it('refuses a duplicate email', async () => {
    const email = `dup-${Date.now()}@knowhub.test`
    await signup({ name: 'A', email, password: PASSWORD })
    await expect(signup({ name: 'B', email, password: PASSWORD })).rejects.toThrowError(/ya existe/i)
  })

  it('gives each signup its own workspace slug', async () => {
    const a = await signup({ name: 'Carlos', email: `c1-${Date.now()}@knowhub.test`, password: PASSWORD })
    const b = await signup({ name: 'Carlos', email: `c2-${Date.now()}@knowhub.test`, password: PASSWORD })
    expect(a.workspaceId).not.toBe(b.workspaceId)
  })
})

describe('login', () => {
  it('accepts the right password and rejects the wrong one with the same message', async () => {
    const email = `login-${Date.now()}@knowhub.test`
    const { userId } = await signup({ name: 'Ana', email, password: PASSWORD })

    await expect(login({ email, password: PASSWORD })).resolves.toEqual({ userId })
    await expect(login({ email, password: 'otra-cosa-123' })).rejects.toThrowError(
      /correo o contraseña incorrectos/i,
    )
    // Same message for an address that does not exist: no account enumeration.
    await expect(login({ email: 'nadie@knowhub.test', password: PASSWORD })).rejects.toThrowError(
      /correo o contraseña incorrectos/i,
    )
  })

  it('repairs a user left without any workspace', async () => {
    const email = `repair-${Date.now()}@knowhub.test`
    const { userId, workspaceId } = await signup({ name: 'Diego', email, password: PASSWORD })

    const db = await getDb()
    await db.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId))

    const repaired = await ensurePersonalWorkspace(userId, 'Diego')
    expect(repaired).toBeTruthy()
    expect(repaired).not.toBe(workspaceId)
  })
})

describe('password reset', () => {
  it('issues a single-use token that actually changes the password', async () => {
    const email = `reset-${Date.now()}@knowhub.test`
    await signup({ name: 'Elena', email, password: PASSWORD })

    const token = await createPasswordResetToken(email)
    expect(token).toBeTruthy()

    await resetPassword(token as string, 'nueva-contrasena-7')
    await expect(login({ email, password: 'nueva-contrasena-7' })).resolves.toBeTruthy()
    await expect(login({ email, password: PASSWORD })).rejects.toThrow()

    // The token is consumed on use.
    await expect(resetPassword(token as string, 'otra-mas-8')).rejects.toThrowError(/no es válido|expiró/i)
  })

  it('returns null for an unknown address rather than revealing it', async () => {
    expect(await createPasswordResetToken('desconocido@knowhub.test')).toBeNull()
  })
})

describe('password hashing', () => {
  it('produces a different hash for the same password each time', async () => {
    const a = await hashPassword(PASSWORD)
    const b = await hashPassword(PASSWORD)
    expect(a).not.toBe(b)
    expect(await verifyPassword(PASSWORD, a)).toBe(true)
    expect(await verifyPassword(PASSWORD, b)).toBe(true)
    expect(await verifyPassword('otra', a)).toBe(false)
  })

  it('rejects a malformed stored hash instead of throwing', async () => {
    expect(await verifyPassword(PASSWORD, 'basura')).toBe(false)
    expect(await verifyPassword(PASSWORD, '')).toBe(false)
  })
})

/** §132 — Rate limiting. */
describe('rate limiting', () => {
  it('allows requests up to the limit and refuses the next one', async () => {
    const id = `test-${Date.now()}`
    let lastAllowed = true
    for (let i = 0; i < 5; i++) {
      lastAllowed = (await consumeRateLimit('signup', id)).allowed
    }
    expect(lastAllowed).toBe(true)

    const overflow = await consumeRateLimit('signup', id)
    expect(overflow.allowed).toBe(false)
    expect(overflow.remaining).toBe(0)
    expect(overflow.resetAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('tracks identifiers independently', async () => {
    const a = `a-${Date.now()}`
    const b = `b-${Date.now()}`
    for (let i = 0; i < 5; i++) await consumeRateLimit('signup', a)
    expect((await consumeRateLimit('signup', a)).allowed).toBe(false)
    expect((await consumeRateLimit('signup', b)).allowed).toBe(true)
  })

  it('snaps windows to a fixed grid', () => {
    const now = new Date('2026-08-20T12:07:33.000Z').getTime()
    expect(windowStartFor(300, now).toISOString()).toBe('2026-08-20T12:05:00.000Z')
  })
})

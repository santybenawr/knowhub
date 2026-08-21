import { and, eq, gt } from 'drizzle-orm'
import { getDb } from '@/server/db/client'
import { userCredentials, users, workspaceMembers, workspaces } from '@/server/db/schema'
import { generateToken, hashPassword, hashToken, verifyPassword } from '@/lib/crypto'
import { AppError, validation } from '@/lib/errors'
import { slugify } from '@/lib/text'
import { recordAudit } from '@/server/audit'
import { assertServerOnly } from '@/server/assert-server'

assertServerOnly('server/auth/service')

export type AuthResult = { userId: string; workspaceId: string }

/**
 * §41/§42 — Sign up.
 *
 * User, credentials, personal workspace and OWNER membership are created in a
 * single transaction: a half-created account with no workspace would strand the
 * user on an empty dashboard. Re-running with an existing email is rejected
 * rather than silently reusing the account.
 */
export async function signup(input: {
  name: string
  email: string
  password: string
}): Promise<AuthResult> {
  const db = await getDb()
  const existing = await findUserByEmail(input.email)
  if (existing) {
    throw validation('Ya existe una cuenta con este correo.', { field: 'email' })
  }

  const passwordHash = await hashPassword(input.password)

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(users)
      .values({ email: input.email, name: input.name })
      .returning({ id: users.id })
    const user = inserted[0]
    if (!user) throw new AppError('internal', 'No pudimos crear la cuenta.')

    await tx.insert(userCredentials).values({ userId: user.id, passwordHash })

    const workspaceId = await createPersonalWorkspaceTx(tx, user.id, input.name)
    await tx.update(users).set({ lastWorkspaceId: workspaceId }).where(eq(users.id, user.id))

    return { userId: user.id, workspaceId }
  })
}

type Tx = Parameters<Parameters<Awaited<ReturnType<typeof getDb>>['transaction']>[0]>[0]

/**
 * Idempotent in the sense that matters: the slug is unique per attempt, so two
 * concurrent signups for the same name cannot collide.
 */
async function createPersonalWorkspaceTx(tx: Tx, userId: string, name: string): Promise<string> {
  const base = slugify(name) || 'workspace'
  const slug = `${base}-${generateToken(4).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6)}`
  const rows = await tx
    .insert(workspaces)
    .values({
      name: `Espacio de ${name.split(' ')[0] ?? name}`,
      slug,
      type: 'personal',
      ownerId: userId,
    })
    .returning({ id: workspaces.id })
  const workspace = rows[0]
  if (!workspace) throw new AppError('internal', 'No pudimos crear tu workspace personal.')

  await tx.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId,
    role: 'OWNER',
  })
  return workspace.id
}

/** Ensures a user always has at least one workspace (repair path). */
export async function ensurePersonalWorkspace(userId: string, name: string): Promise<string> {
  const db = await getDb()
  const existing = await db
    .select({ id: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1)
  const found = existing[0]
  if (found) return found.id
  return db.transaction((tx) => createPersonalWorkspaceTx(tx, userId, name))
}

export async function login(input: { email: string; password: string }): Promise<{ userId: string }> {
  const db = await getDb()
  const rows = await db
    .select({ id: users.id, name: users.name, passwordHash: userCredentials.passwordHash })
    .from(users)
    .innerJoin(userCredentials, eq(userCredentials.userId, users.id))
    .where(eq(users.email, input.email))
    .limit(1)

  const row = rows[0]
  // Same failure message and a real hash comparison either way, so response
  // time does not reveal whether the address exists.
  if (!row) {
    await verifyPassword(input.password, 'scrypt$AAAA$AAAA')
    throw validation('Correo o contraseña incorrectos.')
  }
  const valid = await verifyPassword(input.password, row.passwordHash)
  if (!valid) throw validation('Correo o contraseña incorrectos.')

  await ensurePersonalWorkspace(row.id, row.name)
  return { userId: row.id }
}

async function findUserByEmail(email: string) {
  const db = await getDb()
  const rows = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email)).limit(1)
  return rows[0] ?? null
}

/**
 * §41 — Password recovery. Returns the token so the caller can deliver it;
 * KnowHub has no mail transport configured, and inventing one that silently
 * drops messages would be worse than being explicit about it.
 */
export async function createPasswordResetToken(email: string): Promise<string | null> {
  const db = await getDb()
  const user = await findUserByEmail(email)
  if (!user) return null

  const token = generateToken(32)
  await db
    .update(userCredentials)
    .set({
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      updatedAt: new Date(),
    })
    .where(eq(userCredentials.userId, user.id))

  await recordAudit({ action: 'password_reset_requested', actorId: user.id })
  return token
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const db = await getDb()
  const rows = await db
    .select({ userId: userCredentials.userId })
    .from(userCredentials)
    .where(
      and(
        eq(userCredentials.passwordResetTokenHash, hashToken(token)),
        gt(userCredentials.passwordResetExpiresAt, new Date()),
      ),
    )
    .limit(1)

  const row = rows[0]
  if (!row) throw validation('El enlace de recuperación no es válido o expiró.')

  await db
    .update(userCredentials)
    .set({
      passwordHash: await hashPassword(newPassword),
      passwordResetTokenHash: null,
      passwordResetExpiresAt: null,
      updatedAt: new Date(),
    })
    .where(eq(userCredentials.userId, row.userId))

  await recordAudit({ action: 'password_reset_completed', actorId: row.userId })
}

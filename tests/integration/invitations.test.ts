import { afterAll, describe, expect, it } from 'vitest'
import { and, eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { workspaceInvitations, workspaceMembers, workspaces } from '@/server/db/schema'
import { acceptInvitation, inviteMember } from '@/server/workspaces'
import { hashToken } from '@/lib/crypto'
import { createTestTenant, createTestUser } from '../helpers/factories'

afterAll(closeDb)

async function fixture() {
  const { access } = await createTestTenant({ plan: 'pro' })
  const invitee = await createTestUser()
  const { token } = await inviteMember({ access, email: invitee.email, role: 'MEMBER' })
  return { access, invitee, token, db: await getDb() }
}

async function membership(workspaceId: string, userId: string) {
  const db = await getDb()
  return db.select().from(workspaceMembers).where(and(
    eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId),
  ))
}

describe('invitation acceptance', () => {
  it('rejects another account without consuming the intended recipient’s invitation', async () => {
    const { access, invitee, token, db } = await fixture()
    const stranger = await createTestUser()
    await expect(acceptInvitation(token, stranger.id)).rejects.toMatchObject({ code: 'forbidden' })
    expect(await membership(access.workspaceId, stranger.id)).toHaveLength(0)
    const [invitation] = await db.select().from(workspaceInvitations)
      .where(eq(workspaceInvitations.tokenHash, hashToken(token)))
    expect(invitation?.acceptedAt).toBeNull()
    await expect(acceptInvitation(token, invitee.id)).resolves.toBe(access.workspaceId)
    expect((await membership(access.workspaceId, invitee.id))[0]?.role).toBe('MEMBER')
  })

  it('compares recipient addresses without case or exterior whitespace differences', async () => {
    const { access } = await createTestTenant({ plan: 'pro' })
    const invitee = await createTestUser({ email: `Mixed-${access.workspaceId}@KnowHub.test` })
    const { token } = await inviteMember({ access, email: ` ${invitee.email.toUpperCase()} `, role: 'VIEWER' })
    await expect(acceptInvitation(token, invitee.id)).resolves.toBe(access.workspaceId)
  })

  it('rejects an expired or unknown token without adding members', async () => {
    const { access, invitee, token, db } = await fixture()
    await db.update(workspaceInvitations).set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(workspaceInvitations.tokenHash, hashToken(token)))
    await expect(acceptInvitation(token, invitee.id)).rejects.toMatchObject({ code: 'validation' })
    await expect(acceptInvitation('unknown-token', invitee.id)).rejects.toMatchObject({ code: 'not_found' })
    expect(await membership(access.workspaceId, invitee.id)).toHaveLength(0)
  })

  it('allows exactly one successful acceptance when the same token is submitted twice', async () => {
    const { access, invitee, token } = await fixture()
    const results = await Promise.allSettled([
      acceptInvitation(token, invitee.id), acceptInvitation(token, invitee.id),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    expect(await membership(access.workspaceId, invitee.id)).toHaveLength(1)
    await expect(acceptInvitation(token, invitee.id)).rejects.toMatchObject({ code: 'not_found' })
  })

  it('refuses a deleted workspace and leaves the token unconsumed', async () => {
    const { access, invitee, token, db } = await fixture()
    await db.update(workspaces).set({ deletedAt: new Date() }).where(eq(workspaces.id, access.workspaceId))
    await expect(acceptInvitation(token, invitee.id)).rejects.toMatchObject({ code: 'not_found' })
    expect(await membership(access.workspaceId, invitee.id)).toHaveLength(0)
    const [invitation] = await db.select().from(workspaceInvitations)
      .where(eq(workspaceInvitations.tokenHash, hashToken(token)))
    expect(invitation?.acceptedAt).toBeNull()
  })

  it('refuses an invitation after its sender loses permission to assign its role', async () => {
    const { access, invitee, token, db } = await fixture()
    await db.update(workspaceMembers).set({ role: 'VIEWER' }).where(and(
      eq(workspaceMembers.workspaceId, access.workspaceId), eq(workspaceMembers.userId, access.userId),
    ))
    await expect(acceptInvitation(token, invitee.id)).rejects.toMatchObject({ code: 'forbidden' })
    expect(await membership(access.workspaceId, invitee.id)).toHaveLength(0)
  })

  it('rechecks the current plan and rolls back token consumption when there is no seat', async () => {
    const { access, invitee, token, db } = await fixture()
    await db.update(workspaces).set({ plan: 'free' }).where(eq(workspaces.id, access.workspaceId))
    await expect(acceptInvitation(token, invitee.id)).rejects.toMatchObject({ code: 'validation' })
    expect(await membership(access.workspaceId, invitee.id)).toHaveLength(0)
    await db.update(workspaces).set({ plan: 'pro' }).where(eq(workspaces.id, access.workspaceId))
    await expect(acceptInvitation(token, invitee.id)).resolves.toBe(access.workspaceId)
  })

  it('does not overbook the last seat when different invitations are accepted together', async () => {
    const { access, invitee, token, db } = await fixture()
    const other = await createTestUser()
    const occupied = await createTestUser()
    const second = await inviteMember({ access, email: other.email, role: 'VIEWER' })
    await db.insert(workspaceMembers).values({ workspaceId: access.workspaceId, userId: occupied.id, role: 'MEMBER' })
    const results = await Promise.allSettled([
      acceptInvitation(token, invitee.id), acceptInvitation(second.token, other.id),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, access.workspaceId))
    expect(members).toHaveLength(3)
  })

  it('preserves an existing role without requiring another seat', async () => {
    const { access, invitee, token, db } = await fixture()
    await db.insert(workspaceMembers).values({ workspaceId: access.workspaceId, userId: invitee.id, role: 'VIEWER' })
    await db.update(workspaces).set({ plan: 'free' }).where(eq(workspaces.id, access.workspaceId))
    await expect(acceptInvitation(token, invitee.id)).resolves.toBe(access.workspaceId)
    expect((await membership(access.workspaceId, invitee.id))[0]?.role).toBe('VIEWER')
  })
})

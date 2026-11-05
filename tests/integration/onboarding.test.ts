import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { closeDb, getDb } from '@/server/db/client'
import { projects, users } from '@/server/db/schema'
import { createTestTenant } from '../helpers/factories'

const mocks = vi.hoisted(() => ({
  context: vi.fn(),
  revalidate: vi.fn(),
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))
vi.mock('@/server/auth/guard', () => ({ requirePageContext: mocks.context }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))

import { completeOnboardingAction, skipOnboardingAction } from '@/app/(dashboard)/onboarding/actions'

afterAll(closeDb)
beforeEach(() => vi.clearAllMocks())

async function fixture() {
  const tenant = await createTestTenant()
  mocks.context.mockResolvedValue(tenant)
  return { ...tenant, db: await getDb() }
}

describe('persisted onboarding', () => {
  it('marks an omitted configuration complete without creating a project', async () => {
    const { user, access, db } = await fixture()
    await expect(skipOnboardingAction()).rejects.toThrow('REDIRECT:/dashboard')
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout')
    expect(mocks.revalidate.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]!)
    const [saved] = await db.select().from(users).where(eq(users.id, user.id))
    expect(saved?.onboardingCompletedAt).toBeInstanceOf(Date)
    expect(await db.select().from(projects).where(eq(projects.workspaceId, access.workspaceId))).toHaveLength(0)
    const completedAt = saved!.onboardingCompletedAt!.getTime()
    await expect(skipOnboardingAction()).rejects.toThrow('REDIRECT:/dashboard')
    const [again] = await db.select().from(users).where(eq(users.id, user.id))
    expect(again?.onboardingCompletedAt?.getTime()).toBe(completedAt)
  })

  it('creates the optional project only once when completion is retried', async () => {
    const { user, access, db } = await fixture()
    const input = { purpose: 'estudio', projectName: '  Mi curso  ' }
    await expect(completeOnboardingAction(input)).rejects.toThrow('REDIRECT:/dashboard')
    expect(mocks.revalidate).toHaveBeenCalledWith('/', 'layout')
    expect(mocks.revalidate.mock.invocationCallOrder[0]).toBeLessThan(mocks.redirect.mock.invocationCallOrder[0]!)
    await expect(completeOnboardingAction(input)).rejects.toThrow('REDIRECT:/dashboard')
    const [saved] = await db.select().from(users).where(eq(users.id, user.id))
    expect(saved?.onboardingPurpose).toBe('estudio')
    expect(saved?.onboardingCompletedAt).toBeInstanceOf(Date)
    const savedProjects = await db.select().from(projects).where(eq(projects.workspaceId, access.workspaceId))
    expect(savedProjects).toHaveLength(1)
    expect(savedProjects[0]?.name).toBe('Mi curso')
  })

  it('does not recreate a project when an old onboarding form is submitted after skipping', async () => {
    const { access, db } = await fixture()
    await expect(skipOnboardingAction()).rejects.toThrow('REDIRECT:/dashboard')
    await expect(completeOnboardingAction({ purpose: 'trabajo', projectName: 'Formulario antiguo' }))
      .rejects.toThrow('REDIRECT:/dashboard')
    expect(await db.select().from(projects).where(eq(projects.workspaceId, access.workspaceId))).toHaveLength(0)
  })

  it('creates one project when the same completion arrives concurrently', async () => {
    const { access, db } = await fixture()
    const input = { purpose: 'trabajo', projectName: 'Un único proyecto' }
    const results = await Promise.allSettled([
      completeOnboardingAction(input), completeOnboardingAction(input),
    ])
    for (const result of results) {
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') expect(result.reason.message).toBe('REDIRECT:/dashboard')
    }
    expect(await db.select().from(projects).where(eq(projects.workspaceId, access.workspaceId))).toHaveLength(1)
  })

  it('rejects an oversized project name without completing onboarding or writing a project', async () => {
    const { user, access, db } = await fixture()
    expect(await completeOnboardingAction({ purpose: 'trabajo', projectName: 'a'.repeat(121) }))
      .toMatchObject({ ok: false, error: expect.stringContaining('120') })
    const [saved] = await db.select().from(users).where(eq(users.id, user.id))
    expect(saved?.onboardingCompletedAt).toBeNull()
    expect(await db.select().from(projects).where(eq(projects.workspaceId, access.workspaceId))).toHaveLength(0)
    expect(mocks.revalidate).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })

  it('keeps onboarding incomplete if the optional project cannot be saved', async () => {
    const { user, access, db } = await fixture()
    mocks.context.mockResolvedValue({
      user,
      access: { ...access, workspaceId: '00000000-0000-4000-8000-000000000000' },
    })
    expect(await completeOnboardingAction({ purpose: 'trabajo', projectName: 'Proyecto fallido' }))
      .toMatchObject({ ok: false })
    const [saved] = await db.select().from(users).where(eq(users.id, user.id))
    expect(saved?.onboardingCompletedAt).toBeNull()
    expect(saved?.onboardingPurpose).toBeNull()
    expect(mocks.revalidate).not.toHaveBeenCalled()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})

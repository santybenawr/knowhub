'use server'

import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getDb } from '@/server/db/client'
import { users } from '@/server/db/schema'
import { requirePageContext } from '@/server/auth/guard'
import { createProject } from '@/server/projects'
import { trackEvent } from '@/server/analytics'
import { fail, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

const PURPOSES = ['estudio', 'trabajo', 'empresa', 'investigacion', 'personal'] as const

export async function completeOnboardingAction(input: {
  purpose: string
  projectName: string
}): Promise<ActionResult<undefined>> {
  try {
    const { user, access } = await requirePageContext('content:create')
    const purpose = PURPOSES.includes(input.purpose as (typeof PURPOSES)[number])
      ? input.purpose
      : 'personal'

    const projectName = input.projectName.trim()
    if (projectName.length > 0) {
      await createProject({ access, name: projectName })
    }

    const db = await getDb()
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), onboardingPurpose: purpose, updatedAt: new Date() })
      .where(eq(users.id, user.id))

    await trackEvent('onboarding_completed', access, { purpose })
  } catch (err) {
    return fail(toUserMessage(err))
  }

  redirect('/dashboard')
}

export async function skipOnboardingAction(): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const db = await getDb()
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))
  } catch (err) {
    return fail(toUserMessage(err))
  }
  redirect('/dashboard')
}

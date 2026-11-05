'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getDb } from '@/server/db/client'
import { projects, users } from '@/server/db/schema'
import { requirePageContext } from '@/server/auth/guard'
import { trackEvent } from '@/server/analytics'
import { fail, type ActionResult } from '@/lib/action-result'
import { toUserMessage } from '@/lib/errors'

const onboardingInput = z.object({
  purpose: z.enum(['estudio', 'trabajo', 'empresa', 'investigacion', 'personal']),
  projectName: z.string().trim().max(120, 'El nombre del proyecto no puede superar 120 caracteres.'),
})

export async function completeOnboardingAction(input: {
  purpose: string
  projectName: string
}): Promise<ActionResult<undefined>> {
  try {
    const { user, access } = await requirePageContext('content:create')
    const parsed = onboardingInput.safeParse(input)
    if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Revisa los datos de configuración.')
    const { purpose, projectName } = parsed.data
    const db = await getDb()
    const completed = await db.transaction(async (tx) => {
      // Claim completion once; retrying a response must not create another project.
      const changed = await tx.update(users)
        .set({ onboardingCompletedAt: new Date(), onboardingPurpose: purpose, updatedAt: new Date() })
        .where(and(eq(users.id, user.id), isNull(users.onboardingCompletedAt)))
        .returning({ id: users.id })
      if (changed.length === 0) return false
      if (projectName) {
        await tx.insert(projects).values({
          workspaceId: access.workspaceId,
          createdBy: user.id,
          name: projectName,
          icon: '📁',
        })
      }
      return true
    })

    if (completed) await trackEvent('onboarding_completed', access, { purpose })
  } catch (err) {
    return fail(toUserMessage(err))
  }

  // The shell was rendered before the optional project existed. Invalidate
  // its cached layout before navigation so the first dashboard has fresh links.
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function skipOnboardingAction(): Promise<ActionResult<undefined>> {
  try {
    const { user } = await requirePageContext()
    const db = await getDb()
    await db
      .update(users)
      .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, user.id), isNull(users.onboardingCompletedAt)))
  } catch (err) {
    return fail(toUserMessage(err))
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser, resolveWorkspace } from '@/server/auth/session'
import { ensurePersonalWorkspace } from '@/server/auth/service'
import { OnboardingFlow } from '@/components/shared/onboarding-flow'
import { completeOnboardingAction } from './actions'

export const metadata: Metadata = { title: 'Bienvenido' }

/** §43 — Three steps, no more. */
export default async function OnboardingPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // §42 repair path: a session with no workspace should never dead-end.
  await ensurePersonalWorkspace(user.id, user.name)
  const workspace = await resolveWorkspace(user.id)
  if (!workspace) redirect('/login')

  if (user.onboardingCompletedAt) redirect('/dashboard')

  return (
    <OnboardingFlow
      name={user.name.split(' ')[0] ?? user.name}
      onComplete={completeOnboardingAction}
    />
  )
}

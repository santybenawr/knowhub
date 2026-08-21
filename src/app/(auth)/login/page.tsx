import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { LoginForm } from '@/components/shared/auth-forms'
import { AuthCard } from '@/components/shared/auth-card'

export const metadata: Metadata = { title: 'Iniciar sesión' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>
}) {
  if (await getCurrentUser()) redirect('/dashboard')
  const params = await searchParams

  return (
    <AuthCard title="Bienvenido de vuelta" description="Entra para volver a tu conocimiento.">
      <LoginForm resetDone={params.reset === '1'} />
    </AuthCard>
  )
}

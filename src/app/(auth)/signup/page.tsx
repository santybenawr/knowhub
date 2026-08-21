import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { SignupForm } from '@/components/shared/auth-forms'
import { AuthCard } from '@/components/shared/auth-card'

export const metadata: Metadata = { title: 'Crear cuenta' }

export default async function SignupPage() {
  if (await getCurrentUser()) redirect('/dashboard')

  return (
    <AuthCard
      title="Crea tu cuenta"
      description="Empieza a convertir documentos, notas y reuniones en conocimiento."
    >
      <SignupForm />
    </AuthCard>
  )
}

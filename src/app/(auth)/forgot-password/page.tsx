import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/shared/auth-forms'
import { AuthCard } from '@/components/shared/auth-card'

export const metadata: Metadata = { title: 'Recuperar contraseña' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description="Te enviaremos un enlace para crear una nueva contraseña."
    >
      <ForgotPasswordForm />
    </AuthCard>
  )
}

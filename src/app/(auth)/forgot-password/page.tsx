import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/components/shared/auth-forms'
import { AuthCard } from '@/components/shared/auth-card'
import { isPublicBeta } from '@/lib/release'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Recuperar contraseña' }

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Recuperar contraseña"
      description={isPublicBeta() ? 'La recuperación por correo todavía no está disponible en esta beta.' : 'Te enviaremos un enlace para crear una nueva contraseña.'}
    >
      {isPublicBeta() ? <Link href="/login" className="text-brand hover:underline">Volver a iniciar sesión</Link> : <ForgotPasswordForm />}
    </AuthCard>
  )
}

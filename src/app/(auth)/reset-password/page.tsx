import type { Metadata } from 'next'
import Link from 'next/link'
import { ResetPasswordForm } from '@/components/shared/auth-forms'
import { AuthCard } from '@/components/shared/auth-card'

export const metadata: Metadata = { title: 'Nueva contraseña' }

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams

  if (!token) {
    return (
      <AuthCard title="Enlace no válido" description="Este enlace de recuperación está incompleto.">
        <Link href="/forgot-password" className="block text-center text-sm text-brand hover:underline">
          Solicitar uno nuevo
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Nueva contraseña" description="Elige una contraseña que no uses en otro sitio.">
      <ResetPasswordForm token={token} />
    </AuthCard>
  )
}

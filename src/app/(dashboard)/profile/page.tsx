import type { Metadata } from 'next'
import { requirePageContext } from '@/server/auth/guard'
import { ProfileForm } from '@/features/settings/profile-form'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { logoutAction } from '../actions'
import { updateProfileAction } from '../settings/actions'

export const metadata: Metadata = { title: 'Perfil' }

export default async function ProfilePage() {
  const { user, workspace, access } = await requirePageContext()

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Perfil</h1>
        <p className="mt-1 text-sm text-ink-muted">Tu cuenta y tus preferencias.</p>
      </div>

      <ProfileForm
        name={user.name}
        email={user.email}
        timezone={user.timezone}
        workspaceName={workspace.name}
        role={access.role}
        onSave={updateProfileAction}
        onLogout={logoutAction}
      />

      <section className="surface-card p-5">
        <h2 className="text-lg font-semibold text-ink">Apariencia</h2>
        <p className="mt-1 text-sm text-ink-muted">Claro, oscuro o siguiendo tu sistema.</p>
        <div className="mt-4">
          <ThemeToggle />
        </div>
      </section>
    </div>
  )
}

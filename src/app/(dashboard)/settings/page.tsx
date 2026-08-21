import type { Metadata } from 'next'
import Link from 'next/link'
import { requirePageContext } from '@/server/auth/guard'
import { getUsageSummary } from '@/server/usage'
import { getProviderStatus } from '@/config/env'
import { PLAN_LIMITS } from '@/config/plans'
import { Badge } from '@/components/ui/badge'
import { UsagePanel } from '@/components/shared/usage-panel'
import { WorkspaceSettingsForm } from '@/features/settings/workspace-settings-form'
import { can } from '@/server/permissions'
import { createWorkspaceAction, renameWorkspaceAction } from './actions'

export const metadata: Metadata = { title: 'Configuración' }

export default async function SettingsPage() {
  const { access, workspace } = await requirePageContext()
  const usage = await getUsageSummary(access.workspaceId, access.plan)
  const providers = getProviderStatus()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Configuración</h1>
        <p className="mt-1 text-sm text-ink-muted">Workspace, plan y estado del sistema.</p>
      </div>

      <WorkspaceSettingsForm
        workspaceName={workspace.name}
        canManage={can(access.role, 'workspace:manage')}
        onRename={renameWorkspaceAction}
        onCreate={createWorkspaceAction}
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Uso y plan</h2>
        <UsagePanel usage={usage} />
        <p className="mt-3 text-xs text-ink-muted">
          Planes disponibles: {Object.values(PLAN_LIMITS).map((plan) => plan.label).join(', ')}. Los
          precios se definen antes del lanzamiento comercial.{' '}
          <Link href="/settings/members" className="text-brand hover:underline">
            Gestionar miembros
          </Link>
          .
        </p>
      </section>

      {/* §141 — say plainly which providers are actually running. */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Proveedores activos</h2>
        <dl className="surface-card divide-y divide-border-subtle">
          {[
            { label: 'Base de datos', value: providers.database === 'postgres' ? 'PostgreSQL' : 'PGlite (local)' },
            { label: 'Almacenamiento', value: providers.storage === 'supabase' ? 'Supabase Storage' : 'Local privado' },
            { label: 'Modelo de IA', value: providers.ai === 'openai' ? 'OpenAI' : 'Local determinista' },
            {
              label: 'Transcripción',
              value: providers.transcription === 'openai' ? 'OpenAI Whisper' : 'Local (desarrollo)',
            },
            { label: 'Facturación', value: providers.billing === 'stripe' ? 'Stripe' : 'No configurada' },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-5 py-3">
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd>
                <Badge
                  tone={
                    row.value.includes('Local') || row.value.includes('No configurada')
                      ? 'warning'
                      : 'positive'
                  }
                >
                  {row.value}
                </Badge>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}

import { requirePageContext } from '@/server/auth/guard'
import { listProjects } from '@/server/projects'
import { AppShell } from '@/components/shared/app-shell'
import { CommandPalette } from '@/components/shared/command-palette'
import { logoutAction, switchWorkspaceAction } from './actions'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, workspaces, access } = await requirePageContext()
  const projects = await listProjects(access.workspaceId)

  return (
    <AppShell
      user={{ name: user.name, email: user.email }}
      workspace={workspace}
      workspaces={workspaces}
      projects={projects.map((p) => ({ id: p.id, name: p.name, icon: p.icon }))}
      onSwitchWorkspace={switchWorkspaceAction}
      onLogout={logoutAction}
    >
      <CommandPalette projects={projects.map((p) => ({ id: p.id, name: p.name, icon: p.icon }))} />
      {children}
    </AppShell>
  )
}

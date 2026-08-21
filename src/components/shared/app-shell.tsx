'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'
import { ChevronDown, FolderKanban, LogOut, Plus, Settings, User } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { APP } from '@/config/app'
import { cn } from '@/lib/utils'
import { initialsOf } from '@/lib/text'
import { Logo } from './logo'
import { ThemeToggle } from './theme-toggle'
import { PRIMARY_NAV } from './nav-config'
import { Button } from '@/components/ui/button'

export type ShellWorkspace = { id: string; name: string; type: string; role: string }
export type ShellProject = { id: string; name: string; icon: string }

type Props = {
  user: { name: string; email: string }
  workspace: ShellWorkspace
  workspaces: ShellWorkspace[]
  projects: ShellProject[]
  onSwitchWorkspace: (workspaceId: string) => Promise<void>
  onLogout: () => Promise<void>
  children: React.ReactNode
}

/**
 * §48/§49 — App shell.
 *
 * Desktop gets a persistent sidebar; mobile gets a bottom bar with the five
 * destinations that matter on a phone. The mobile layout is designed for the
 * phone rather than being the desktop one scaled down.
 */
export function AppShell({
  user,
  workspace,
  workspaces,
  projects,
  onSwitchWorkspace,
  onLogout,
  children,
}: Props) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border-subtle bg-surface lg:flex">
        <div className="flex h-16 items-center gap-2.5 px-5">
          <Logo className="size-8" />
          <span className="font-semibold tracking-tight text-ink">{APP.name}</span>
        </div>

        <div className="px-3">
          <WorkspaceSwitcher
            workspace={workspace}
            workspaces={workspaces}
            onSwitch={onSwitchWorkspace}
          />
        </div>

        <nav className="scrollbar-thin mt-4 flex-1 overflow-y-auto px-3 pb-4">
          <ul className="space-y-0.5">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-brand-soft text-brand-ink'
                      : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                  )}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {'desktopLabel' in item ? item.desktopLabel : item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <div className="flex items-center justify-between px-3 pb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                Proyectos
              </span>
              <Link
                href="/projects"
                className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
                aria-label="Ver todos los proyectos"
              >
                <Plus className="size-3.5" />
              </Link>
            </div>
            <ul className="space-y-0.5">
              {projects.slice(0, 8).map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className={cn(
                      'flex items-center gap-2.5 truncate rounded-lg px-3 py-1.5 text-sm transition-colors',
                      pathname === `/projects/${project.id}`
                        ? 'bg-surface-muted text-ink'
                        : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
                    )}
                  >
                    <span aria-hidden>{project.icon}</span>
                    <span className="truncate">{project.name}</span>
                  </Link>
                </li>
              ))}
              {projects.length === 0 ? (
                <li className="px-3 py-1.5 text-sm text-ink-faint">Sin proyectos aún</li>
              ) : null}
            </ul>
          </div>
        </nav>

        <div className="border-t border-border-subtle p-3">
          <div className="mb-2 flex justify-center">
            <ThemeToggle />
          </div>
          <UserMenu user={user} onLogout={onLogout} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-subtle bg-canvas/90 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo className="size-7" />
          <span className="font-semibold tracking-tight text-ink">{APP.name}</span>
        </Link>
        <div className="flex items-center gap-1.5">
          <WorkspaceSwitcher
            workspace={workspace}
            workspaces={workspaces}
            onSwitch={onSwitchWorkspace}
            compact
          />
        </div>
      </header>

      <div className="lg:pl-64">
        <main id="contenido" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        <ul className="grid grid-cols-5">
          {PRIMARY_NAV.filter((item) => item.mobile).map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                  isActive(item.href) ? 'text-brand' : 'text-ink-faint',
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/profile"
              className={cn(
                'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                isActive('/profile') ? 'text-brand' : 'text-ink-faint',
              )}
            >
              <User className="size-5" aria-hidden />
              Perfil
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  )
}

function WorkspaceSwitcher({
  workspace,
  workspaces,
  onSwitch,
  compact = false,
}: {
  workspace: ShellWorkspace
  workspaces: ShellWorkspace[]
  onSwitch: (id: string) => Promise<void>
  compact?: boolean
}) {
  const [pending, startTransition] = React.useTransition()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 rounded-lg border border-border-subtle bg-surface px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-muted',
            compact ? 'max-w-[9rem]' : 'w-full',
          )}
          disabled={pending}
        >
          <FolderKanban className="size-4 shrink-0 text-ink-faint" aria-hidden />
          <span className="min-w-0 flex-1 truncate font-medium text-ink">{workspace.name}</span>
          <ChevronDown className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 w-60 rounded-lg border border-border-subtle bg-surface p-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Workspaces
          </DropdownMenu.Label>
          {workspaces.map((item) => (
            <DropdownMenu.Item
              key={item.id}
              onSelect={() => startTransition(() => void onSwitch(item.id))}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm outline-none',
                'data-[highlighted]:bg-surface-muted',
                item.id === workspace.id ? 'font-medium text-ink' : 'text-ink-muted',
              )}
            >
              <span className="truncate">{item.name}</span>
              <span className="shrink-0 text-xs text-ink-faint">{item.role.toLowerCase()}</span>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border-subtle" />
          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-ink-muted outline-none data-[highlighted]:bg-surface-muted"
            >
              <Settings className="size-3.5" aria-hidden />
              Configuración del workspace
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

function UserMenu({
  user,
  onLogout,
}: {
  user: { name: string; email: string }
  onLogout: () => Promise<void>
}) {
  const [pending, startTransition] = React.useTransition()

  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink"
        aria-hidden
      >
        {initialsOf(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{user.name}</p>
        <p className="truncate text-xs text-ink-faint">{user.email}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Cerrar sesión"
        loading={pending}
        onClick={() => startTransition(() => void onLogout())}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  )
}

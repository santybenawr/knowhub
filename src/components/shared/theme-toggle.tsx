'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'knowhub-theme'

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

function applyTheme(theme: Theme): void {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * §122 — light / dark / system, persisted locally and applied immediately.
 *
 * The stored preference is an external store, so it is read through
 * `useSyncExternalStore` rather than copied into state inside an effect. The
 * server snapshot is `null`, which renders the control unselected until
 * hydration — no flash, no mismatch. The pre-paint script in the root layout
 * has already applied the class by then.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const subscribe = React.useCallback((onChange: () => void) => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onMediaChange = () => {
      if (readTheme() === 'system') applyTheme('system')
      onChange()
    }
    window.addEventListener('storage', onChange)
    media.addEventListener('change', onMediaChange)
    return () => {
      window.removeEventListener('storage', onChange)
      media.removeEventListener('change', onMediaChange)
    }
  }, [])

  const [localTheme, setLocalTheme] = React.useState<Theme | null>(null)
  const storedTheme = React.useSyncExternalStore<Theme | null>(
    subscribe,
    () => readTheme(),
    () => null,
  )
  const theme = localTheme ?? storedTheme

  const choose = (next: Theme) => {
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
    setLocalTheme(next)
  }

  const options: Array<{ value: Theme; label: string; icon: React.ReactNode }> = [
    { value: 'light', label: 'Claro', icon: <Sun className="size-3.5" /> },
    { value: 'dark', label: 'Oscuro', icon: <Moon className="size-3.5" /> },
    { value: 'system', label: 'Sistema', icon: <Monitor className="size-3.5" /> },
  ]

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-lg border border-border-subtle bg-surface p-0.5',
        className,
      )}
      role="radiogroup"
      aria-label="Tema de la interfaz"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={theme === option.value}
          aria-label={option.label}
          title={option.label}
          onClick={() => choose(option.value)}
          className={cn(
            'rounded-md p-1.5 transition-colors',
            theme === option.value
              ? 'bg-brand-soft text-brand-ink'
              : 'text-ink-faint hover:bg-surface-muted hover:text-ink',
          )}
        >
          {option.icon}
        </button>
      ))}
    </div>
  )
}

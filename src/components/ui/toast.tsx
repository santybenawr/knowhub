'use client'

import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import * as React from 'react'
import { cn } from '@/lib/utils'

type Toast = { id: number; message: string; tone: 'info' | 'success' | 'error' }

type ToastContextValue = {
  notify: (message: string, tone?: Toast['tone']) => void
}

const ToastContext = React.createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext)
  // A component outside the provider should still be usable; swallowing the
  // notification is better than crashing the page over a toast.
  return context ?? { notify: () => undefined }
}

/** §190 — In-app notifications only; no push permissions are ever requested. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])
  const nextId = React.useRef(0)

  const notify = React.useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = nextId.current++
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, 6000)
  }, [])

  const value = React.useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 md:bottom-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm shadow-lg',
              'border-border-subtle bg-surface text-ink',
            )}
          >
            <ToastIcon tone={toast.tone} />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
              aria-label="Cerrar notificación"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastIcon({ tone }: { tone: Toast['tone'] }) {
  if (tone === 'success') return <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-positive" />
  if (tone === 'error') return <XCircle className="mt-0.5 size-4 shrink-0 text-record" />
  return <Info className="mt-0.5 size-4 shrink-0 text-brand" />
}

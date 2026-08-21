'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

/** Client-side error boundary. Never renders a stack trace to the user. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Algo salió mal</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        Ocurrió un error inesperado. Puedes reintentar o volver al inicio.
      </p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Reintentar</Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard">Ir al inicio</Link>
        </Button>
      </div>
    </div>
  )
}

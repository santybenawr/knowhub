'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

/** Server-rendered content must follow background ingestion without a reload. */
export function ProcessingRefresh({ active }: { active: boolean }) {
  return active ? <ActiveProcessingRefresh /> : null
}

function ActiveProcessingRefresh() {
  const router = useRouter()
  const [automatic, setAutomatic] = useState(true)
  useEffect(() => {
    if (!automatic) return
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 2500)
    const timeout = setTimeout(() => setAutomatic(false), 120_000)
    return () => { clearInterval(interval); clearTimeout(timeout) }
  }, [automatic, router])
  if (automatic) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-subtle bg-surface-muted p-3 text-sm" role="status">
      <p>El procesamiento está tardando más de lo habitual. Puedes seguir usando KnowHub y revisar el recurso después.</p>
      <Button variant="secondary" size="sm" onClick={() => { router.refresh(); setAutomatic(true) }}>Actualizar estado</Button>
    </div>
  )
}

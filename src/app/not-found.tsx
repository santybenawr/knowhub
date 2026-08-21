import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <Logo className="size-10" />
      <h1 className="text-2xl font-bold tracking-tight text-ink">No encontramos esta página</h1>
      <p className="max-w-sm text-sm text-ink-muted">
        Es posible que el recurso se haya eliminado, o que pertenezca a otro workspace.
      </p>
      <Button asChild className="mt-2">
        <Link href="/dashboard">Volver a KnowHub</Link>
      </Button>
    </div>
  )
}

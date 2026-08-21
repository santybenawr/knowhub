import Link from 'next/link'
import { APP } from '@/config/app'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { Logo } from '@/components/shared/logo'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border-subtle bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo className="size-8" />
            <span className="text-lg font-semibold tracking-tight text-ink">{APP.name}</span>
          </Link>
          <nav className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Empezar gratis</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="contenido" className="flex-1">
        {children}
      </main>

      <footer className="border-t border-border-subtle">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {APP.name}. {APP.tagline}
          </p>
          <nav className="flex gap-5">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacidad
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Términos
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

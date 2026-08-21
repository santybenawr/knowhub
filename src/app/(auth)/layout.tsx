import Link from 'next/link'
import { APP } from '@/config/app'
import { Logo } from '@/components/shared/logo'
import { ThemeToggle } from '@/components/shared/theme-toggle'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="size-8" />
          <span className="font-semibold tracking-tight text-ink">{APP.name}</span>
        </Link>
        <ThemeToggle />
      </header>
      <main id="contenido" className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}

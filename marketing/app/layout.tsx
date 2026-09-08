import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { LandingShell } from '@/features/marketing/landing-shell'
import './marketing-globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })

export const metadata: Metadata = {
  title: { default: 'KnowHub — Menos buscar. Más conectar.', template: '%s · KnowHub' },
  description: 'Tus documentos, notas y reuniones, conectados. Conoce KnowHub y explora un primer vistazo a una nueva forma de encontrar respuestas. Próximamente.',
  applicationName: 'KnowHub',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
  openGraph: {
    title: 'KnowHub — Menos buscar. Más conectar.',
    description: 'Un nuevo lugar para todo lo que sabes. Explora la demo. Próximamente.',
    type: 'website',
    locale: 'es_CO',
    siteName: 'KnowHub',
  },
  twitter: { card: 'summary', title: 'KnowHub — Menos buscar. Más conectar.', description: 'Un nuevo lugar para todo lo que sabes. Próximamente.' },
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0b0c10' }

export default function PrelaunchLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es" className={inter.variable}><body><a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white">Saltar al contenido</a><LandingShell prelaunch>{children}</LandingShell></body></html>
}

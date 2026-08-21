import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { APP } from '@/config/app'
import { ToastProvider } from '@/components/ui/toast'
import './globals.css'

/**
 * Self-hosted by `next/font`, so there is no request to a third-party font host
 * at runtime — one less origin in the CSP and no render-blocking round trip.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: { default: `${APP.name} — ${APP.tagline}`, template: `%s · ${APP.name}` },
  description: APP.description,
  applicationName: APP.name,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: APP.name, statusBarStyle: 'default' },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f7' },
    { media: '(prefers-color-scheme: dark)', color: '#1b1a20' },
  ],
}

/**
 * §122 — Theme is applied before first paint so a dark-mode user never sees a
 * white flash. The stored value is the user's explicit choice; "system" defers
 * to the OS and keeps following it.
 */
const THEME_SCRIPT = `(function(){try{
  var pref = localStorage.getItem('knowhub-theme') || 'system';
  var dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', dark);
}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <a
          href="#contenido"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
        >
          Saltar al contenido
        </a>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}

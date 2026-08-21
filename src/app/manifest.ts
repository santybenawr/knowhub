import type { MetadataRoute } from 'next'
import { APP } from '@/config/app'

/** §123 — Installable PWA. Offline support is deliberately not claimed. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${APP.name} — ${APP.tagline}`,
    short_name: APP.name,
    description: APP.description,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#5b4bd6',
    lang: 'es',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }
}

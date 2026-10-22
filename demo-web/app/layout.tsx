import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'KnowHub · Demo interactiva',
  description:
    'Explora el MVP de KnowHub con documentos, notas, reuniones y consultas con fuentes. Datos ficticios y cambios temporales.',
  robots: { index: false, follow: false },
}
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <noscript>
          Activa JavaScript para explorar la demo interactiva de KnowHub.
        </noscript>
        {children}
      </body>
    </html>
  )
}

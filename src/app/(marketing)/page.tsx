import type { Metadata } from 'next'
import { LandingPage } from '@/features/marketing/landing-page'

export const metadata: Metadata = {
  title: 'KnowHub — Menos buscar. Más conectar.',
  description: 'Tus documentos, notas y reuniones, conectados. Encuentra respuestas en lo que ya sabes y vuelve a la fuente con KnowHub.',
}

export default function HomePage() {
  return <LandingPage />
}

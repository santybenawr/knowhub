import type { Metadata } from 'next'
import { LandingPage } from '@/features/marketing/landing-page'
import { redirect } from 'next/navigation'
import { isPublicBeta } from '@/lib/release'

export const metadata: Metadata = {
  title: 'KnowHub — Menos buscar. Más conectar.',
  description: 'Tus documentos, notas y reuniones, conectados. Encuentra respuestas en lo que ya sabes y vuelve a la fuente con KnowHub.',
}

export default function HomePage() {
  if (isPublicBeta()) redirect('/dashboard')
  return <LandingPage />
}

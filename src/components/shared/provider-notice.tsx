import { FlaskConical } from 'lucide-react'
import { getProviderStatus } from '@/config/env'

/**
 * §78/§90 — When the deterministic local providers are in play, say so on the
 * surface. Silently serving extractive stubs as if they were a model would make
 * every other honesty guarantee in this product worthless.
 */
export function ProviderNotice() {
  const status = getProviderStatus()
  const mockedAi = status.ai === 'mock'
  const mockedTranscription = status.transcription === 'mock'
  if (!mockedAi && !mockedTranscription) return null

  const parts: string[] = []
  if (mockedAi) parts.push('el análisis y las respuestas se generan en modo de ejemplo')
  if (mockedTranscription) parts.push('el audio genera una transcripción ficticia de ejemplo, no lo que se dijo en la grabación')

  return (
    <div className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning-soft p-4">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="text-sm">
        <p className="font-medium text-ink">Modo de demostración local</p>
        <p className="mt-0.5 text-ink-muted">
          En esta configuración, {parts.join(' y ')}.
          {mockedTranscription ? ' Para trabajar con el contenido real de una reunión, importa su transcripción revisada.' : ''}
        </p>
      </div>
    </div>
  )
}

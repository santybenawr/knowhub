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
  if (mockedAi) parts.push('el análisis y las respuestas usan el proveedor local determinista')
  if (mockedTranscription) parts.push('la transcripción de audio usa el proveedor de desarrollo')

  return (
    <div className="flex items-start gap-3 rounded-card border border-warning/40 bg-warning-soft p-4">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="text-sm">
        <p className="font-medium text-ink">Modo desarrollo sin proveedores de IA</p>
        <p className="mt-0.5 text-ink-muted">
          Sin credenciales configuradas, {parts.join(' y ')}. Todo el flujo funciona, pero los resultados
          no provienen de un modelo. Configura <code className="font-mono text-xs">OPENAI_API_KEY</code>{' '}
          para activar los proveedores reales, o importa una transcripción real desde una reunión.
        </p>
      </div>
    </div>
  )
}

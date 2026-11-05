'use client'

import * as React from 'react'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Logo } from './logo'
import { GettingStartedGuide } from './getting-started-guide'
import { cn } from '@/lib/utils'
import { isPublicBeta } from '@/lib/release'
import type { ActionResult } from '@/lib/action-result'

const PURPOSES = [
  { id: 'estudio', label: 'Estudio', description: 'Clases, apuntes y lecturas' },
  { id: 'trabajo', label: 'Trabajo', description: 'Reuniones y documentos del día a día' },
  { id: 'empresa', label: 'Empresa', description: 'Información y proyectos de mi empresa' },
  { id: 'investigacion', label: 'Investigación', description: 'Fuentes, entrevistas y hallazgos' },
  { id: 'personal', label: 'Personal', description: 'Ideas y conocimiento propio' },
]

export function OnboardingFlow({
  name,
  onComplete,
  onSkip,
}: {
  name: string
  onComplete: (input: { purpose: string; projectName: string }) => Promise<ActionResult<undefined>>
  onSkip: () => Promise<ActionResult<undefined>>
}) {
  const [step, setStep] = React.useState(0)
  const [purpose, setPurpose] = React.useState('trabajo')
  const [projectName, setProjectName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()
  const stepHeading = React.useRef<HTMLHeadingElement>(null)

  React.useEffect(() => {
    stepHeading.current?.focus()
  }, [step])

  const finish = () => {
    setError(null)
    startTransition(async () => {
      const result = await onComplete({ purpose, projectName })
      if (result && !result.ok) setError(result.error)
    })
  }

  const skip = () => {
    setError(null)
    startTransition(async () => {
      const result = await onSkip()
      if (result && !result.ok) setError(result.error)
    })
  }

  return (
    <div className="mx-auto max-w-xl py-6">
      <div className="mb-8 flex items-center gap-3">
        <Logo className="size-9" />
        <div>
          <p className="text-sm text-ink-muted">Hola, {name}</p>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Configuremos tu KnowHub</h1>
        </div>
      </div>

      <ol className="mb-7 flex gap-2" aria-label="Progreso de configuración">
        {['Tu objetivo', 'Proyecto opcional', 'Guía de uso'].map((label, index) => (
          <li
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-brand' : 'bg-surface-muted',
            )}
            aria-current={index === step ? 'step' : undefined}
          >
            <span className="sr-only">Paso {index + 1}: {label}</span>
          </li>
        ))}
      </ol>

      <div className="surface-card p-6">
        <p className="mb-2 text-xs font-medium text-ink-faint" aria-live="polite">Paso {step + 1} de 3</p>
        <h2 ref={stepHeading} tabIndex={-1} className="mb-2 text-lg font-semibold text-ink outline-none">
          {['¿Para qué quieres usar KnowHub?', 'Crea tu primer proyecto', 'Cómo usar KnowHub'][step]}
        </h2>
        {step === 0 ? (
          <fieldset>
            <legend className="sr-only">¿Para qué quieres usar KnowHub?</legend>
            <p className="mt-1 text-sm text-ink-muted">Nos ayuda a ordenar tu espacio inicial.</p>
            <div className="mt-5 space-y-2">
              {PURPOSES.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-brand focus-within:ring-offset-2',
                    purpose === option.id
                      ? 'border-brand bg-brand-soft'
                      : 'border-border-subtle hover:border-border-strong',
                  )}
                >
                  <input
                    type="radio"
                    name="purpose"
                    value={option.id}
                    checked={purpose === option.id}
                    onChange={() => setPurpose(option.id)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-full border',
                      purpose === option.id ? 'border-brand bg-brand text-white' : 'border-border-strong',
                    )}
                    aria-hidden
                  >
                    {purpose === option.id ? <Check className="size-3" /> : null}
                  </span>
                  <span>
                    <span className="block font-medium text-ink">{option.label}</span>
                    <span className="block text-xs text-ink-muted">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <div>
            <p className="mt-1 text-sm text-ink-muted">
              Un proyecto agrupa documentos, notas y reuniones de un mismo tema. Puedes omitir este paso.
            </p>
            <div className="mt-5">
              <Field label="Nombre del proyecto" htmlFor="projectName">
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Proyecto Omega"
                  maxLength={120}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="mb-4 text-sm text-ink-muted">Tres pasos para empezar con tu propia información.</p>
            <GettingStartedGuide />
            <p className="mt-4 text-xs text-ink-muted">
              La guía completa queda en «Ayuda y guía», también en el móvil.
              {isPublicBeta() ? ' Guarda tu contraseña: la recuperación por correo aún no está disponible.' : ''}
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-4 text-sm text-record" role="alert">{error}</p> : null}

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <Button variant="ghost" onClick={skip} loading={pending}>
              Omitir
            </Button>
          )}

          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={pending}>
              Continuar <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button onClick={finish} loading={pending}>
              Entrar a KnowHub <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

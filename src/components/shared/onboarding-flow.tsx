'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, FileText, Mic, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/field'
import { Logo } from './logo'
import { cn } from '@/lib/utils'
import type { ActionResult } from '@/lib/action-result'

const PURPOSES = [
  { id: 'estudio', label: 'Estudio', description: 'Clases, apuntes y lecturas' },
  { id: 'trabajo', label: 'Trabajo', description: 'Reuniones y documentos del día a día' },
  { id: 'empresa', label: 'Empresa', description: 'Equipos y proyectos compartidos' },
  { id: 'investigacion', label: 'Investigación', description: 'Fuentes, entrevistas y hallazgos' },
  { id: 'personal', label: 'Personal', description: 'Ideas y conocimiento propio' },
]

export function OnboardingFlow({
  name,
  onComplete,
}: {
  name: string
  onComplete: (input: { purpose: string; projectName: string }) => Promise<ActionResult<undefined>>
}) {
  const [step, setStep] = React.useState(0)
  const [purpose, setPurpose] = React.useState('trabajo')
  const [projectName, setProjectName] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [pending, startTransition] = React.useTransition()

  const finish = () => {
    setError(null)
    startTransition(async () => {
      const result = await onComplete({ purpose, projectName })
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

      <ol className="mb-7 flex gap-2" aria-label="Progreso">
        {[0, 1, 2].map((index) => (
          <li
            key={index}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              index <= step ? 'bg-brand' : 'bg-surface-muted',
            )}
            aria-current={index === step ? 'step' : undefined}
          />
        ))}
      </ol>

      <div className="surface-card p-6">
        {step === 0 ? (
          <fieldset>
            <legend className="text-lg font-semibold text-ink">¿Para qué quieres usar KnowHub?</legend>
            <p className="mt-1 text-sm text-ink-muted">Nos ayuda a ordenar tu espacio inicial.</p>
            <div className="mt-5 space-y-2">
              {PURPOSES.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
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
            <h2 className="text-lg font-semibold text-ink">Crea tu primer proyecto</h2>
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
                  autoFocus
                />
              </Field>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <h2 className="text-lg font-semibold text-ink">Todo listo</h2>
            <p className="mt-1 text-sm text-ink-muted">Así es como entra la información a KnowHub:</p>
            <ul className="mt-5 space-y-2.5">
              {[
                { icon: Mic, label: 'Grabar reunión', description: 'La transcribimos y extraemos decisiones' },
                { icon: FileText, label: 'Subir documento', description: 'PDF, Word, Markdown o texto' },
                { icon: NotebookPen, label: 'Crear nota', description: 'Se indexa automáticamente' },
              ].map((item) => (
                <li key={item.label} className="flex items-start gap-3 rounded-lg bg-surface-muted p-3">
                  <item.icon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <span>
                    <span className="block font-medium text-ink">{item.label}</span>
                    <span className="block text-xs text-ink-muted">{item.description}</span>
                  </span>
                </li>
              ))}
            </ul>
            {error ? (
              <p className="mt-4 text-sm text-record" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-7 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <Link href="/dashboard" className="text-sm text-ink-faint hover:text-ink hover:underline">
              Omitir
            </Link>
          )}

          {step < 2 ? (
            <Button onClick={() => setStep((s) => s + 1)}>
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

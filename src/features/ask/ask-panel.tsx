'use client'

import * as React from 'react'
import { AlertTriangle, ArrowUp, Loader2, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { cn } from '@/lib/utils'
import { AnswerWithCitations, CitationList, type CitationView } from './citations'
import { useAsk, type AskScope } from './use-ask'

/**
 * §100/§102/§117 — Ask surface, shared by `/ask` and the meeting "Preguntar" tab.
 *
 * When `onCitationClick` is supplied (inside a meeting) citations seek the
 * player already on screen instead of navigating away.
 */
export function AskPanel({
  scope,
  placeholder = 'Pregunta algo sobre tu conocimiento...',
  suggestions = [],
  onCitationClick,
  emptyTitle = '¿Qué quieres recordar?',
  emptyDescription = 'Pregunta en lenguaje natural. KnowHub responde solo con lo que hay en tu biblioteca y te muestra la fuente.',
  className,
}: {
  scope: AskScope
  placeholder?: string
  suggestions?: string[]
  onCitationClick?: (citation: CitationView) => void
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}) {
  const { turns, pending, ask } = useAsk(scope)
  const [value, setValue] = React.useState('')
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  const submit = async (question: string) => {
    if (!question.trim() || pending) return
    setValue('')
    await ask(question)
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {turns.length === 0 ? (
        <div className="rounded-card border border-dashed border-border-strong px-6 py-10 text-center">
          <Sparkles className="mx-auto size-6 text-brand" aria-hidden />
          <h2 className="mt-3 text-lg font-semibold text-ink">{emptyTitle}</h2>
          <p className="mx-auto mt-1.5 max-w-md text-balance text-sm text-ink-muted">
            {emptyDescription}
          </p>
          {suggestions.length > 0 ? (
            <ul className="mt-5 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    onClick={() => void submit(suggestion)}
                    className="rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-sm text-ink-muted transition-colors hover:border-border-strong hover:text-ink"
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <ol className="space-y-6">
          {turns.map((turn) => (
            <li key={turn.id} className="space-y-3">
              <p className="font-medium text-ink">{turn.question}</p>

              {turn.status === 'searching' ? (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Search className="size-4 animate-pulse" aria-hidden />
                  Buscando en tu conocimiento...
                </p>
              ) : null}

              {turn.status === 'generating' && turn.answer === '' ? (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Redactando la respuesta...
                </p>
              ) : null}

              {turn.answer ? (
                <div className="surface-card p-4">
                  <AnswerWithCitations
                    answer={turn.answer}
                    citations={turn.citations}
                    {...(onCitationClick ? { onCitationClick } : {})}
                  />
                  <CitationList
                    citations={turn.citations}
                    {...(onCitationClick ? { onCitationClick } : {})}
                    className="mt-4 border-t border-border-subtle pt-4"
                  />
                </div>
              ) : null}

              {turn.status === 'error' ? (
                <p
                  className="flex items-start gap-2 rounded-lg border border-record/40 bg-record-soft p-3 text-sm text-ink"
                  role="alert"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-record" aria-hidden />
                  {turn.error}
                </p>
              ) : null}
            </li>
          ))}
          <div ref={endRef} />
        </ol>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit(value)
        }}
        className="sticky bottom-20 lg:bottom-4"
      >
        <div className="flex items-end gap-2 rounded-card border border-border-strong bg-surface p-2 shadow-sm">
          <Textarea
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void submit(value)
              }
            }}
            placeholder={placeholder}
            aria-label="Tu pregunta"
            rows={1}
            className="min-h-10 flex-1 resize-none border-0 bg-transparent focus:border-0"
          />
          <Button type="submit" size="icon" disabled={!value.trim() || pending} aria-label="Preguntar">
            {pending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-1.5 px-1 text-xs text-ink-faint">
          KnowHub responde con tu biblioteca y cita la fuente. Verifica antes de decidir.
        </p>
      </form>
    </div>
  )
}

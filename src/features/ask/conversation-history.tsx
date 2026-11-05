import { AnswerWithCitations, CitationList, type CitationView } from './citations'

export type ConversationMessageView = {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: CitationView[]
}

/** Persisted messages have chronology, but no durable question/answer pairing. */
export function ConversationHistory({ messages }: { messages: ConversationMessageView[] }) {
  if (messages.length === 0) return null
  return (
    <ol aria-label="Mensajes guardados" className="space-y-4">
      {messages.map(message => (
        <li key={message.id} className={message.role === 'assistant' ? 'surface-card space-y-3 p-4' : 'space-y-2'}>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {message.role === 'user' ? 'Tú' : 'KnowHub'}
          </p>
          {message.role === 'user' ? (
            <p className="whitespace-pre-wrap font-medium text-ink">{message.content}</p>
          ) : (
            <>
              <AnswerWithCitations answer={message.content} citations={message.citations} />
              <CitationList citations={message.citations} />
              {[...message.content.matchAll(/\[(\d+)\]/g)].some(match => !message.citations.some(citation => citation.index === Number(match[1]))) ? (
                <p className="text-xs text-ink-muted">Las fuentes de esta respuesta ya no están disponibles. Pueden haberse eliminado o actualizado.</p>
              ) : null}
            </>
          )}
        </li>
      ))}
    </ol>
  )
}

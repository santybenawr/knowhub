'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import type { CitationView } from './citations'
import { readAskStream } from './read-ask-stream'

export type AskScope =
  | { type: 'workspace' }
  | { type: 'project'; projectId: string }
  | { type: 'document'; documentId: string }
  | { type: 'note'; noteId: string }
  | { type: 'meeting'; meetingId: string }

export type AskTurn = {
  id: string
  question: string
  answer: string
  citations: CitationView[]
  status: 'searching' | 'generating' | 'done' | 'error'
  error?: string
}

/**
 * §117 — Consumes the NDJSON stream from `/api/ask`.
 *
 * Frames are decoded line by line, so a chunk that splits mid-JSON is buffered
 * rather than dropped. Turns are kept locally; the server is the durable copy.
 */
export function useAsk(scope: AskScope, initial?: { conversationId: string }) {
  const router = useRouter()
  const [turns, setTurns] = React.useState<AskTurn[]>([])
  const [pending, setPending] = React.useState(false)
  const [conversationId, setConversationId] = React.useState<string | null>(initial?.conversationId ?? null)
  const conversationRef = React.useRef<string | null>(initial?.conversationId ?? null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const patch = React.useCallback((id: string, update: Partial<AskTurn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...update } : turn)))
  }, [])

  const ask = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed.length < 2 || pending || abortRef.current) return

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setTurns((current) => [
        ...current,
        { id, question: trimmed, answer: '', citations: [], status: 'searching' },
      ])
      setPending(true)

      const controller = new AbortController()
      abortRef.current = controller
      const timeout = setTimeout(() => controller.abort('timeout'), 135_000)

      try {
        const response = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: trimmed,
            scope,
            ...(conversationRef.current ? { conversationId: conversationRef.current } : {}),
          }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          const detail = (await response.json().catch(() => null)) as { error?: string } | null
          patch(id, { status: 'error', error: detail?.error ?? 'No pudimos responder tu pregunta.' })
          return
        }

        let answer = ''
        let terminal = false

        for await (const frame of readAskStream(response.body)) {
          if (abortRef.current !== controller) return
          switch (frame.type) {
            case 'status':
              patch(id, { status: frame.value })
              break
            case 'citations':
              patch(id, { citations: frame.value })
              break
            case 'delta':
              answer += frame.value
              patch(id, { answer })
              break
            case 'done':
              terminal = true
              conversationRef.current = frame.conversationId
              setConversationId(frame.conversationId)
              patch(id, { status: 'done' })
              router.refresh()
              break
            case 'error':
              terminal = true
              patch(id, { status: 'error', error: frame.value })
              break
          }
          if (terminal) break
        }

        if (!terminal) patch(id, { status: 'error', error: 'La respuesta quedó incompleta. Intenta de nuevo.' })
      } catch {
        if (controller.signal.aborted && controller.signal.reason !== 'timeout') return
        if (controller.signal.reason === 'timeout') {
          patch(id, { status: 'error', error: 'La respuesta tardó demasiado. Intenta de nuevo.' })
          return
        }
        patch(id, { status: 'error', error: 'Se interrumpió la conexión. Intenta de nuevo.' })
      } finally {
        clearTimeout(timeout)
        if (abortRef.current === controller) {
          setPending(false)
          abortRef.current = null
        }
      }
    },
    [patch, pending, scope, router],
  )

  const reset = React.useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    conversationRef.current = null
    setConversationId(null)
    setTurns([])
    setPending(false)
  }, [])

  return { turns, pending, ask, reset, conversationId }
}

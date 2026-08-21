'use client'

import * as React from 'react'
import type { CitationView } from './citations'

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

type Frame =
  | { type: 'status'; value: 'searching' | 'generating' }
  | { type: 'citations'; value: CitationView[] }
  | { type: 'delta'; value: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; value: string }

/**
 * §117 — Consumes the NDJSON stream from `/api/ask`.
 *
 * Frames are decoded line by line, so a chunk that splits mid-JSON is buffered
 * rather than dropped. Turns are kept locally; the server is the durable copy.
 */
export function useAsk(scope: AskScope) {
  const [turns, setTurns] = React.useState<AskTurn[]>([])
  const [pending, setPending] = React.useState(false)
  const conversationRef = React.useRef<string | null>(null)
  const abortRef = React.useRef<AbortController | null>(null)

  React.useEffect(() => () => abortRef.current?.abort(), [])

  const patch = React.useCallback((id: string, update: Partial<AskTurn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...update } : turn)))
  }, [])

  const ask = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim()
      if (trimmed.length < 2 || pending) return

      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setTurns((current) => [
        ...current,
        { id, question: trimmed, answer: '', citations: [], status: 'searching' },
      ])
      setPending(true)

      const controller = new AbortController()
      abortRef.current = controller

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

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let answer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (line.trim() === '') continue
            let frame: Frame
            try {
              frame = JSON.parse(line) as Frame
            } catch {
              continue
            }

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
                conversationRef.current = frame.conversationId
                patch(id, { status: 'done' })
                break
              case 'error':
                patch(id, { status: 'error', error: frame.value })
                break
            }
          }
        }

        patch(id, { status: 'done' })
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        patch(id, { status: 'error', error: 'Se interrumpió la conexión. Intenta de nuevo.' })
      } finally {
        setPending(false)
        abortRef.current = null
      }
    },
    [patch, pending, scope],
  )

  const reset = React.useCallback(() => {
    abortRef.current?.abort()
    conversationRef.current = null
    setTurns([])
    setPending(false)
  }, [])

  return { turns, pending, ask, reset }
}

import type { CitationView } from './citations'

export type AskFrame =
  | { type: 'status'; value: 'searching' | 'generating' }
  | { type: 'citations'; value: CitationView[] }
  | { type: 'delta'; value: string }
  | { type: 'done'; conversationId: string }
  | { type: 'error'; value: string }

/** Network chunks can split JSON or UTF-8 characters, including the final line. */
export async function* readAskStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<AskFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let ended = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim()) yield parseFrame(line)
      }
      if (done) {
        ended = true
        if (buffer.trim()) yield parseFrame(buffer)
        return
      }
    }
  } finally {
    if (!ended) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}

function parseFrame(line: string): AskFrame {
  const frame = JSON.parse(line) as AskFrame
  if (!frame || typeof frame !== 'object') throw new Error('Invalid response frame')
  switch (frame.type) {
    case 'status':
      if (frame.value === 'searching' || frame.value === 'generating') return frame
      break
    case 'citations':
      if (Array.isArray(frame.value)) return frame
      break
    case 'delta':
    case 'error':
      if (typeof frame.value === 'string') return frame
      break
    case 'done':
      if (typeof frame.conversationId === 'string' && frame.conversationId) return frame
  }
  throw new Error('Invalid response frame')
}

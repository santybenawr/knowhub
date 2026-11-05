import { describe, expect, it, vi } from 'vitest'
import { readAskStream, type AskFrame } from '@/features/ask/read-ask-stream'

function stream(text: string, chunkSize = 1) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (let i = 0; i < bytes.length; i += chunkSize) controller.enqueue(bytes.slice(i, i + chunkSize))
      controller.close()
    },
  })
}

async function readAll(body: ReadableStream<Uint8Array>) {
  const frames: AskFrame[] = []
  for await (const frame of readAskStream(body)) frames.push(frame)
  return frames
}

describe('Ask response delivery', () => {
  it('preserves accented text split across network chunks and accepts a final frame without a newline', async () => {
    const expected: AskFrame[] = [
      { type: 'status', value: 'searching' },
      { type: 'delta', value: 'La reunión será el miércoles.' },
      { type: 'done', conversationId: 'conversation-1' },
    ]
    expect(await readAll(stream(expected.map(frame => JSON.stringify(frame)).join('\n')))).toEqual(expected)
  })

  it('does not silently drop a damaged response', async () => {
    await expect(readAll(stream('{"type":"delta","value":broken}\n'))).rejects.toThrow()
  })

  it('rejects invalid completion frames instead of marking an answer saved', async () => {
    await expect(readAll(stream('{"type":"done"}\n'))).rejects.toThrow('Invalid response frame')
  })

  it('releases an unfinished connection when the caller has received a terminal error', async () => {
    const cancel = vi.fn()
    const body = new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new TextEncoder().encode('{"type":"error","value":"Reintenta"}\n')) },
      cancel,
    })
    for await (const frame of readAskStream(body)) {
      expect(frame.type).toBe('error')
      break
    }
    expect(cancel).toHaveBeenCalledOnce()
    expect(body.locked).toBe(false)
  })
})

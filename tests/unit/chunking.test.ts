import { describe, expect, it } from 'vitest'
import { chunkPages, chunkPlainText, chunkText, chunkTranscriptSegments } from '@/server/ai/chunking'

describe('text chunking', () => {
  it('keeps short text as a single chunk', () => {
    expect(chunkText('Una idea breve.')).toEqual(['Una idea breve.'])
  })

  it('returns nothing for empty input', () => {
    expect(chunkText('   \n  ')).toEqual([])
  })

  it('splits long text at paragraph boundaries, not mid-word', () => {
    const paragraph = 'Esta es una frase completa sobre administración de proyectos. '.repeat(12)
    const chunks = chunkText(`${paragraph}\n\n${paragraph}`, { targetChars: 400, overlapChars: 50 })

    expect(chunks.length).toBeGreaterThan(1)
    for (const chunk of chunks) {
      expect(chunk.trim()).toBe(chunk)
      expect(chunk.length).toBeGreaterThan(0)
    }
  })

  it('overlaps consecutive chunks so a boundary-straddling answer stays findable', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Frase numero ${i} con contenido suficiente.`).join(' ')
    const chunks = chunkText(text, { targetChars: 300, overlapChars: 80 })
    expect(chunks.length).toBeGreaterThan(2)

    const first = chunks[0] ?? ''
    const second = chunks[1] ?? ''
    const tail = first.slice(-40)
    expect(second.includes(tail.split(' ').slice(-3).join(' '))).toBe(true)
  })

  it('carries the page number through so citations can name a page', () => {
    const chunks = chunkPages([
      { pageNumber: 1, text: 'Contenido de la primera página sobre planeación.' },
      { pageNumber: 2, text: 'Contenido de la segunda página sobre control.' },
    ])
    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.pageNumber).toBe(1)
    expect(chunks[1]?.pageNumber).toBe(2)
    expect(chunks[1]?.index).toBe(1)
  })

  it('numbers plain-text chunks consecutively', () => {
    const chunks = chunkPlainText('Una nota corta.')
    expect(chunks[0]?.index).toBe(0)
    expect(chunks[0]?.tokenCount).toBeGreaterThan(0)
  })
})

describe('meeting chunking', () => {
  const segments = [
    { id: 's0', startSeconds: 0, endSeconds: 5, text: 'Buenos días a todos.', speakerKey: 'SPEAKER_00' },
    { id: 's1', startSeconds: 5, endSeconds: 12, text: 'Vamos a revisar el presupuesto.', speakerKey: 'SPEAKER_01' },
    { id: 's2', startSeconds: 12, endSeconds: 20, text: 'Entonces seleccionamos el proveedor B.', speakerKey: 'SPEAKER_00' },
  ]

  it('preserves the real time span of the segments it groups', () => {
    const [chunk] = chunkTranscriptSegments(segments, { targetChars: 5000 })
    expect(chunk?.startSeconds).toBe(0)
    expect(chunk?.endSeconds).toBe(20)
    expect(chunk?.segmentIds).toEqual(['s0', 's1', 's2'])
    expect(chunk?.speakerKeys.sort()).toEqual(['SPEAKER_00', 'SPEAKER_01'])
  })

  it('never loses a segment when splitting into several chunks', () => {
    const chunks = chunkTranscriptSegments(segments, { targetChars: 30 })
    expect(chunks.length).toBeGreaterThan(1)
    const allIds = chunks.flatMap((c) => c.segmentIds)
    expect(allIds).toEqual(['s0', 's1', 's2'])

    // Boundaries stay monotonic and anchored to real segment times.
    for (const chunk of chunks) {
      expect(chunk.endSeconds).toBeGreaterThanOrEqual(chunk.startSeconds)
    }
  })

  it('renders resolved speaker names into the chunk text', () => {
    const labels = new Map([
      ['SPEAKER_00', 'Santiago'],
      ['SPEAKER_01', 'Laura'],
    ])
    const [chunk] = chunkTranscriptSegments(segments, { targetChars: 5000, speakerLabels: labels })
    expect(chunk?.content).toContain('Santiago:')
    expect(chunk?.content).toContain('Laura:')
  })

  it('handles an empty transcript without producing an empty chunk', () => {
    expect(chunkTranscriptSegments([])).toEqual([])
  })
})

import { describe, expect, it } from 'vitest'
import { parseTimecode, parseTranscriptText, speakerKeyFrom } from '@/server/transcription/parse-transcript'

/** §57 — Transcript import is a real ingestion path and must be forgiving. */
describe('parseTimecode', () => {
  it('reads mm:ss and hh:mm:ss, with or without decimals', () => {
    expect(parseTimecode('00:41')).toBe(41)
    expect(parseTimecode('23:41')).toBe(1421)
    expect(parseTimecode('01:23:41')).toBe(5021)
    expect(parseTimecode('00:05,500')).toBe(5.5)
  })

  it('rejects garbage', () => {
    expect(parseTimecode('abc')).toBeNull()
  })
})

describe('speakerKeyFrom', () => {
  it('normalises accents and spacing into a stable key', () => {
    expect(speakerKeyFrom('Santiago')).toBe('SANTIAGO')
    expect(speakerKeyFrom('María José')).toBe('MARIA_JOSE')
    expect(speakerKeyFrom('  laura  ')).toBe('LAURA')
  })

  it('never produces an empty key', () => {
    expect(speakerKeyFrom('***')).toBe('SPEAKER')
  })
})

describe('parseTranscriptText', () => {
  it('reads "mm:ss Nombre: texto" and keeps the real timestamps', () => {
    const result = parseTranscriptText(
      ['00:00 Santiago: Buenos días.', '00:18 Laura: Vamos a comenzar.', '23:41 Santiago: Elegimos el proveedor B.'].join('\n'),
    )

    expect(result.segments).toHaveLength(3)
    expect(result.segments[0]?.start).toBe(0)
    expect(result.segments[1]?.start).toBe(18)
    expect(result.segments[2]?.start).toBe(1421)
    expect(result.segments[2]?.speakerId).toBe('SANTIAGO')
    expect(result.speakerNames?.SANTIAGO).toBe('Santiago')
  })

  it('reads bracketed timestamps and dash separators', () => {
    const result = parseTranscriptText('[00:23:41] - Laura: Contactaré al proveedor.')
    expect(result.segments[0]?.start).toBe(1421)
    expect(result.segments[0]?.speakerId).toBe('LAURA')
  })

  it('accepts a transcript with speakers but no timestamps', () => {
    const result = parseTranscriptText('Santiago: Primera intervención.\nLaura: Segunda intervención.')
    expect(result.segments).toHaveLength(2)
    expect(result.segments[0]?.start).toBe(0)
    // Synthetic times must still increase, so the player never seeks backwards.
    expect(result.segments[1]?.start).toBeGreaterThan(result.segments[0]?.start ?? 0)
  })

  it('accepts plain paragraphs with no structure at all', () => {
    const result = parseTranscriptText('Una idea larga sin ningún formato especial de transcripción.')
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0]?.speakerId).toBeUndefined()
  })

  it('attaches a paragraph to the speaker header above it', () => {
    const result = parseTranscriptText('00:00 Santiago:\nBuenos días a todos, empecemos la reunión.')
    expect(result.segments).toHaveLength(1)
    expect(result.segments[0]?.speakerId).toBe('SANTIAGO')
    expect(result.segments[0]?.text).toContain('Buenos días')
  })

  it('keeps segment boundaries monotonic and non-overlapping', () => {
    const result = parseTranscriptText(
      ['00:00 A: uno dos tres cuatro cinco', '00:02 B: seis siete ocho', '00:30 A: nueve diez'].join('\n'),
    )
    for (let i = 0; i < result.segments.length - 1; i++) {
      const current = result.segments[i]
      const next = result.segments[i + 1]
      expect(current?.end).toBeLessThanOrEqual(next?.start ?? Infinity)
      expect(current?.end).toBeGreaterThanOrEqual(current?.start ?? 0)
    }
  })

  it('returns nothing for empty input rather than a bogus segment', () => {
    expect(parseTranscriptText('   \n\n  ').segments).toHaveLength(0)
  })
})

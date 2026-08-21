import { beforeEach, describe, expect, it } from 'vitest'
import { resetServerEnvCache } from '@/config/env'
import { extensionOf, sniffMimeType, validateAudioFile, validateDocumentFile } from '@/server/documents/validation'
import { isAppError } from '@/lib/errors'
import { makeWavFixture } from '../fixtures/transcript'

const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.from('contenido')])
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00])
const TEXT = Buffer.from('Un documento de texto plano sobre administración.', 'utf8')

beforeEach(() => resetServerEnvCache())

/** §125/§196 — The declared MIME is a hint; the bytes decide. */
describe('mime sniffing', () => {
  it('recognises formats from their magic bytes', () => {
    expect(sniffMimeType(PDF, 'x.pdf')).toBe('application/pdf')
    expect(sniffMimeType(TEXT, 'x.txt')).toBe('text/plain')
    expect(sniffMimeType(TEXT, 'x.md')).toBe('text/markdown')
    expect(sniffMimeType(makeWavFixture(), 'x.wav')).toBe('audio/wav')
    expect(sniffMimeType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00]), 'x.webm')).toBe('audio/webm')
  })

  it('uses the extension only to disambiguate zip containers', () => {
    expect(sniffMimeType(ZIP, 'x.docx')).toContain('wordprocessingml')
    expect(sniffMimeType(ZIP, 'x.zip')).toBe('application/zip')
  })

  it('returns null for binary it does not recognise', () => {
    expect(sniffMimeType(Buffer.from([0x00, 0x01, 0x02, 0x03]), 'x.bin')).toBeNull()
  })

  it('reads the extension off a filename', () => {
    expect(extensionOf('informe final.PDF')).toBe('pdf')
    expect(extensionOf('sin-extension')).toBe('')
  })
})

describe('document validation', () => {
  it('accepts a real PDF and reports the detected type, not the declared one', () => {
    const file = validateDocumentFile({ buffer: PDF, filename: 'a.pdf', declaredMime: 'text/plain' })
    expect(file.mimeType).toBe('application/pdf')
    expect(file.extension).toBe('pdf')
  })

  it('rejects a file whose bytes contradict its extension', () => {
    expect(() =>
      validateDocumentFile({ buffer: PDF, filename: 'a.txt', declaredMime: 'text/plain' }),
    ).toThrowError(/no coincide/i)
  })

  it('rejects an unsupported extension even with valid content', () => {
    try {
      validateDocumentFile({ buffer: TEXT, filename: 'a.rtf', declaredMime: 'text/plain' })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(isAppError(err) && err.code).toBe('unsupported')
    }
  })

  it('rejects an empty file', () => {
    expect(() =>
      validateDocumentFile({ buffer: Buffer.alloc(0), filename: 'a.txt', declaredMime: 'text/plain' }),
    ).toThrowError(/vacío/i)
  })

  it('enforces the configured size cap', () => {
    process.env.MAX_UPLOAD_MB = '1'
    resetServerEnvCache()
    const big = Buffer.alloc(2 * 1024 * 1024, 0x41)
    expect(() =>
      validateDocumentFile({ buffer: big, filename: 'a.txt', declaredMime: 'text/plain' }),
    ).toThrowError(/máximo/i)
    delete process.env.MAX_UPLOAD_MB
    resetServerEnvCache()
  })
})

describe('audio validation', () => {
  it('accepts a WAV and keeps the browser codec parameters when they agree', () => {
    const wav = makeWavFixture()
    expect(validateAudioFile({ buffer: wav, filename: 'a.wav', declaredMime: 'audio/wav' }).mimeType).toBe(
      'audio/wav',
    )

    const webm = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00])
    const validated = validateAudioFile({
      buffer: webm,
      filename: 'a.webm',
      declaredMime: 'audio/webm;codecs=opus',
    })
    expect(validated.mimeType).toBe('audio/webm;codecs=opus')
    expect(validated.extension).toBe('webm')
  })

  it('rejects a document uploaded as audio', () => {
    expect(() =>
      validateAudioFile({ buffer: PDF, filename: 'a.webm', declaredMime: 'audio/webm' }),
    ).toThrowError(/no soportado/i)
  })
})

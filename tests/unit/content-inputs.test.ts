import { describe, expect, it } from 'vitest'
import { parseLibraryFilters } from '@/features/library/filter-state'
import { decodeDocumentText } from '@/server/documents/decode-text'
import { TextParser, MarkdownParser } from '@/server/documents/parsers/text'
import { validateDocumentFile } from '@/server/documents/validation'

describe('library query parameters', () => {
  it('normalizes malformed and repeated values before they reach UUID columns', () => {
    expect(parseLibraryFilters({ kind: ['note', 'document'], project: 'undefined', format: ['txt', 'pdf'] })).toEqual({ kind: null, projectId: null, format: null })
    expect(parseLibraryFilters({ project: ['af52ddcb-3e50-445a-81f8-8d2d915d1ef3'] }).projectId).toBeNull()
  })
  it('combines a document format with a project and clears incompatible formats', () => {
    const project = 'af52ddcb-3e50-445a-81f8-8d2d915d1ef3'
    expect(parseLibraryFilters({ format: 'txt', project })).toEqual({ kind: 'document', format: 'txt', projectId: project })
    expect(parseLibraryFilters({ kind: 'note', format: 'pdf', project })).toEqual({ kind: 'note', format: null, projectId: project })
  })
})

describe('text decoding validation', () => {
  it('decodes Windows smart quotes without replacement characters', () => {
    expect(decodeDocumentText(Buffer.from([0x93, 0x48, 0x6f, 0x6c, 0x61, 0x94]))).toBe('“Hola”')
  })
  it('validates the entire file instead of ignoring binary bytes after the preview', () => {
    const buffer = Buffer.concat([Buffer.alloc(5000, 0x41), Buffer.from([0, 1, 2])])
    expect(() => validateDocumentFile({ buffer, filename: 'falso.txt', declaredMime: 'text/plain' })).toThrow()
  })
  it('rejects corrupted BOM-declared Unicode instead of indexing damaged text', () => {
    expect(() => decodeDocumentText(Buffer.from([0xff, 0xfe, 0x41]))).toThrow(/codificación/)
    expect(() => decodeDocumentText(Buffer.from([0xef, 0xbb, 0xbf, 0xc3]))).toThrow(/codificación/)
  })
  it('reports an actionable error for text with no searchable content', async () => {
    await expect(new TextParser().parse({ buffer: Buffer.from('  \r\n\t') })).rejects.toThrow('no contiene texto')
    await expect(new MarkdownParser().parse({ buffer: Buffer.from('### \n') })).rejects.toThrow('no contiene texto')
  })
})

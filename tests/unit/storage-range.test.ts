import { describe, expect, it } from 'vitest'
import { parseByteRange } from '@/server/storage/range'
describe('HTTP byte ranges', () => {
  it.each([
    ['bytes=0-4', { start: 0, end: 4 }],
    ['bytes=5-', { start: 5, end: 9 }],
    ['bytes=-3', { start: 7, end: 9 }],
    ['bytes=0-999', { start: 0, end: 9 }],
    ['bytes=-99', { start: 0, end: 9 }],
    ['bytes=10-', 'unsatisfiable'],
    ['bytes=6-2', 'unsatisfiable'],
    ['bytes=-0', 'unsatisfiable'],
    ['bytes=0-1,3-4', null],
    ['bytes=bad', null],
    [null, null],
  ])('handles %s', (header, expected) => {
    expect(parseByteRange(header as string | null, 10)).toEqual(expected)
  })
  it('rejects ranges for empty files', () => { expect(parseByteRange('bytes=0-', 0)).toBe('unsatisfiable') })
})

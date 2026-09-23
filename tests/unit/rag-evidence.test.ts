import { describe, it, expect } from 'vitest'
import { keepCitedOnly, validateCitedAnswer, type Citation } from '@/server/ai/rag'
const citations = [{ index: 1 }, { index: 2 }] as Citation[]
describe('answer citations', () => {
  it('does not attach retrieved sources to an uncited answer', () => {
    expect(keepCitedOnly('An unsupported answer.', citations)).toEqual([])
  })
  it('does not attach unrelated sources for fabricated citation numbers', () => {
    expect(keepCitedOnly('Unsupported [99].', citations)).toEqual([])
  })
  it('keeps only explicitly referenced sources', () => {
    expect(keepCitedOnly('Supported [2].', citations)).toEqual([citations[1]])
  })
})

it('abstains if any reference is fabricated, even with a valid reference', () => {
  expect(validateCitedAnswer('Supported [1] but invented [99].', citations).usedEvidence).toBe(false)
})
it('returns evidence only for an answer with valid references', () => {
  expect(validateCitedAnswer('Source content [1].', citations)).toEqual({ answer: 'Source content [1].', citations: [citations[0]], usedEvidence: true })
})

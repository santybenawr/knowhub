import { describe, expect, it } from 'vitest'
import { findEvidence, SEED, stateSchema } from '../../demo-web/lib/data'

describe('public demo evidence', () => {
  it('returns only literal source excerpts', () => {
    const hits = findEvidence(
      '¿Qué proveedor vamos a seleccionar?',
      SEED.resources,
    )
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0]?.segment).toBe(2)
    for (const hit of hits)
      expect(hit.resource.segments?.[hit.segment!]?.text).toBe(hit.text)
  })
  it('abstains for absent subjects, mixed unrelated claims and empty queries', () => {
    for (const question of [
      '¿Cuál es la temperatura de Neptuno?',
      '¿Proveedor marciano intergaláctico?',
      '¿Qué?',
      '',
    ])
      expect(findEvidence(question, SEED.resources)).toEqual([])
  })
  it('only searches supplied scope and does not use prepared summaries as evidence', () => {
    expect(
      findEvidence(
        'proveedor',
        SEED.resources.filter((r) => r.project === 'Finanzas'),
      ),
    ).toEqual([])
    expect(
      findEvidence('inventado', [
        {
          id: 'x',
          kind: 'note',
          title: 'Título',
          project: '',
          content: '',
          summary: 'inventado',
        },
      ]),
    ).toEqual([])
  })
  it('rejects malformed or excessive session data', () => {
    expect(stateSchema.safeParse(SEED).success).toBe(true)
    expect(stateSchema.safeParse({ ...SEED, version: 0 }).success).toBe(false)
    expect(
      stateSchema.safeParse({
        ...SEED,
        resources: Array(101).fill(SEED.resources[0]),
      }).success,
    ).toBe(false)
  })
})

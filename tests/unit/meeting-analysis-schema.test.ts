import { describe, expect, it } from 'vitest'
import { meetingAnalysisSchema, pruneAnalysisEvidence } from '@/validations/meeting-analysis'
import { analyseTranscript } from '@/server/ai/mock'

/** §91/§92/§93 — The analysis contract, including what it refuses to invent. */
describe('meeting analysis schema', () => {
  it('fills in empty collections rather than failing on a sparse response', () => {
    const parsed = meetingAnalysisSchema.parse({ summary: 'Resumen breve.' })
    expect(parsed.decisions).toEqual([])
    expect(parsed.actionItems).toEqual([])
    expect(parsed.topics).toEqual([])
  })

  it('normalises a missing or blank responsible and deadline to null', () => {
    const parsed = meetingAnalysisSchema.parse({
      actionItems: [
        { task: 'Enviar el informe', evidenceSegmentIds: ['s1'] },
        { task: 'Llamar al proveedor', responsible: '   ', deadline: '', evidenceSegmentIds: ['s2'] },
      ],
    })
    expect(parsed.actionItems[0]?.responsible).toBeNull()
    expect(parsed.actionItems[0]?.deadline).toBeNull()
    expect(parsed.actionItems[1]?.responsible).toBeNull()
    expect(parsed.actionItems[1]?.deadline).toBeNull()
  })

  it('rejects an insight with no text', () => {
    expect(() => meetingAnalysisSchema.parse({ decisions: [{ text: '', evidenceSegmentIds: [] }] })).toThrow()
  })
})

describe('evidence pruning', () => {
  it('drops segment ids that do not exist in the transcript', () => {
    const analysis = meetingAnalysisSchema.parse({
      decisions: [{ text: 'Elegir proveedor B', evidenceSegmentIds: ['real', 'inventado'] }],
      actionItems: [{ task: 'Contactar', evidenceSegmentIds: ['fantasma'] }],
    })

    const pruned = pruneAnalysisEvidence(analysis, new Set(['real']))
    expect(pruned.decisions[0]?.evidenceSegmentIds).toEqual(['real'])
    expect(pruned.actionItems[0]?.evidenceSegmentIds).toEqual([])
  })
})

/** §152 — The documented fixture and its expected extraction. */
describe('rule-based transcript analysis (development provider)', () => {
  const transcript = [
    '[s0] 00:00 Speaker 1: Necesitamos decidir qué proveedor utilizar.',
    '[s1] 00:05 Speaker 2: El proveedor B ofrece mejores condiciones.',
    '[s2] 00:10 Speaker 1: Entonces vamos a seleccionar el proveedor B.',
    '[s3] 00:15 Speaker 2: Yo contactaré al proveedor mañana.',
    '[s4] 00:20 Speaker 1: ¿Incluye soporte técnico?',
  ].join('\n')

  const analysis = analyseTranscript(transcript)

  it('extracts the decision with the segment that supports it', () => {
    const decision = analysis.decisions.find((d) => d.text.includes('proveedor B'))
    expect(decision).toBeDefined()
    expect(decision?.evidenceSegmentIds).toEqual(['s2'])
  })

  it('extracts the action item and attributes it to the speaker who committed', () => {
    const action = analysis.actionItems.find((a) => a.task.includes('contactaré'))
    expect(action).toBeDefined()
    expect(action?.responsible).toBe('Speaker 2')
    expect(action?.deadline).toBe('mañana')
    expect(action?.evidenceSegmentIds).toEqual(['s3'])
  })

  it('leaves the responsible null when nobody claimed the task', () => {
    const analysisWithoutOwner = analyseTranscript('[s0] 00:00 Speaker 1: Tenemos que enviar el informe.')
    const action = analysisWithoutOwner.actionItems[0]
    expect(action).toBeDefined()
    expect(action?.responsible).toBeNull()
    expect(action?.deadline).toBeNull()
  })

  it('captures open questions', () => {
    expect(analysis.openQuestions.some((q) => q.text.includes('soporte técnico'))).toBe(true)
  })

  it('lists only speakers that appear in the transcript', () => {
    expect(analysis.participants.sort()).toEqual(['Speaker 1', 'Speaker 2'])
  })

  it('returns a valid, empty-but-parseable analysis for an empty transcript', () => {
    const empty = analyseTranscript('')
    expect(empty.decisions).toEqual([])
    expect(empty.actionItems).toEqual([])
    expect(empty.participants).toEqual([])
  })
})

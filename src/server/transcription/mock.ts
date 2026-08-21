import { createHash } from 'node:crypto'
import type { TranscribeInput, TranscriptionProvider, TranscriptionResult } from './types'

/**
 * §78 — Development and test transcription provider.
 *
 * It cannot decode audio, and it does not pretend to: it returns a fixed,
 * clearly-fictional script with `isMock: true`, which the UI surfaces as a
 * warning banner on every meeting produced this way. Timing is derived from the
 * real byte length so segment boundaries line up with the audio the user can
 * actually play back, and the output is deterministic for a given input, which
 * is what makes CI assertions on the meeting pipeline meaningful.
 *
 * For a real transcript without a provider configured, use "Importar
 * transcripción" (§57) — that path is not a mock.
 */

const SCRIPT: Array<{ speaker: string; text: string }> = [
  { speaker: 'SPEAKER_00', text: 'Necesitamos decidir qué proveedor utilizar para el Proyecto Omega.' },
  { speaker: 'SPEAKER_01', text: 'Revisé las tres propuestas. El proveedor B ofrece mejores condiciones de soporte y un precio 12% menor.' },
  { speaker: 'SPEAKER_00', text: '¿El proveedor B incluye soporte técnico en el mismo contrato?' },
  { speaker: 'SPEAKER_01', text: 'Sí, incluye soporte durante los primeros doce meses.' },
  { speaker: 'SPEAKER_00', text: 'Entonces vamos a seleccionar el proveedor B.' },
  { speaker: 'SPEAKER_01', text: 'Perfecto. Yo contacto al proveedor mañana para iniciar el contrato.' },
  { speaker: 'SPEAKER_02', text: 'Tenemos que enviar el informe de cierre antes del 30 de agosto.' },
  { speaker: 'SPEAKER_00', text: 'Queda pendiente definir el presupuesto de la segunda fase.' },
]

export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'mock'
  readonly isMock = true
  readonly supportsDiarization = true

  async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
    // Roughly 16 kB per second of compressed speech; only used so the fake
    // segments span a duration comparable to the real recording.
    const estimatedDuration = Math.max(30, Math.round(input.audio.byteLength / 16_000))
    const perSegment = estimatedDuration / SCRIPT.length

    // Deterministic per input: the same audio always yields the same transcript.
    const seed = createHash('sha256').update(input.audio.subarray(0, 4096)).digest()[0] ?? 0
    const offset = seed % 3

    const segments = SCRIPT.map((line, index) => {
      const start = Math.round(index * perSegment * 10) / 10
      const end = Math.round(Math.min(estimatedDuration, (index + 1) * perSegment) * 10) / 10
      return {
        id: String(index),
        start,
        end: Math.max(start + 1, end),
        text: line.text,
        speakerId: line.speaker,
        confidence: 0.9 - ((index + offset) % 4) * 0.05,
      }
    })

    return {
      text: SCRIPT.map((l) => l.text).join('\n'),
      language: input.language ?? 'es',
      durationSeconds: estimatedDuration,
      segments,
      isMock: true,
      model: 'mock-transcription-v1',
    }
  }
}

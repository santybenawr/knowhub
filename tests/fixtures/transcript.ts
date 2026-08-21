/**
 * §152 — Deterministic transcript fixture used by the meeting tests.
 *
 * Original, fictional content. The expected outcome is stated alongside it so
 * the assertions describe product behaviour rather than restating the code.
 */
export const OMEGA_TRANSCRIPT = `00:00 Santiago: Necesitamos decidir qué proveedor utilizar para el Proyecto Omega.
00:05 Laura: El proveedor B ofrece mejores condiciones de soporte y un precio menor.
00:10 Santiago: ¿El proveedor B incluye soporte técnico?
00:14 Laura: Sí, incluye soporte durante los primeros doce meses.
00:20 Santiago: Entonces vamos a seleccionar el proveedor B.
00:26 Laura: Perfecto. Yo contacto al proveedor mañana para iniciar el contrato.
00:33 Carlos: Tenemos que enviar el informe de cierre antes del 30 de agosto.
00:41 Santiago: Queda pendiente definir el presupuesto de la segunda fase.`

export const EXPECTED = {
  decisionContains: 'proveedor B',
  actionContains: 'contacto al proveedor',
  responsible: 'Laura',
  speakers: ['SANTIAGO', 'LAURA', 'CARLOS'],
}

/** A minimal but structurally valid WAV file, for audio upload paths. */
export function makeWavFixture(seconds = 1): Buffer {
  const sampleRate = 8000
  const samples = sampleRate * seconds
  const dataSize = samples * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(sampleRate * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples; i++) {
    buffer.writeInt16LE(Math.round(Math.sin(i / 20) * 8000), 44 + i * 2)
  }
  return buffer
}

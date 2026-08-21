import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'knowhub-e2e-2026'

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@knowhub.test`
}

/** Signs up and walks the three onboarding steps, landing on the dashboard. */
export async function signupAndOnboard(page: Page, name: string): Promise<string> {
  const email = uniqueEmail(name.toLowerCase())

  await page.goto('/signup')
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirmar contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await expect(page).toHaveURL(/\/onboarding/)
  return email
}

export async function completeOnboarding(page: Page, projectName: string): Promise<void> {
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Nombre del proyecto').fill(projectName)
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByRole('button', { name: 'Entrar a KnowHub' }).click()
  await expect(page).toHaveURL(/\/dashboard/)
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña').fill(PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/(dashboard|onboarding)/)
}

/** A structurally valid WAV, so the upload passes real MIME sniffing. */
export function wavFixture(seconds = 2): Buffer {
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

export const OMEGA_TRANSCRIPT = `00:00 Santiago: Necesitamos decidir qué proveedor utilizar para el Proyecto Omega.
00:12 Laura: El proveedor B ofrece mejores condiciones de soporte.
00:25 Santiago: Entonces vamos a seleccionar el proveedor B.
00:41 Laura: Perfecto. Yo contacto al proveedor mañana para iniciar el contrato.
00:58 Carlos: Tenemos que enviar el informe antes del 30 de agosto.`

/** Waits for the background pipeline to finish, polling the real status API. */
export async function waitForMeetingReady(page: Page, meetingId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`/api/meetings/${meetingId}/status`)
        if (!response.ok()) return 'pending'
        const body = (await response.json()) as { transcriptionStatus: string }
        return body.transcriptionStatus
      },
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toBe('completed')
}

export function meetingIdFromUrl(url: string): string {
  const match = url.match(/\/meetings\/([0-9a-f-]{36})/)
  if (!match?.[1]) throw new Error(`No meeting id in ${url}`)
  return match[1]
}

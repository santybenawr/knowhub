import { randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import { completeOnboarding, OMEGA_TRANSCRIPT, waitForMeetingReady, meetingIdFromUrl } from '../e2e/helpers'

async function register(page: Page, name: string) {
  const email = `beta-qa-${randomBytes(10).toString('hex')}@knowhub.test`
  const password = `${randomBytes(24).toString('base64url')}9a`
  await page.goto('/signup')
  await page.getByLabel('Nombre').fill(name)
  await page.getByLabel('Correo').fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(password)
  await page.getByLabel('Confirmar contraseña').fill(password)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/onboarding/)
  await completeOnboarding(page, 'Verificación de beta')
  return { email, password }
}

test('public registration persists notes and privately processes a document and transcript', async ({ page, browser, baseURL }) => {
  const account = await register(page, 'Verificación Beta')
  await expect(page.getByText('Beta pública', { exact: true })).toBeVisible()
  await page.goto('/notes/new')
  await page.getByLabel('Título').fill('Nota de verificación beta')
  await page.getByLabel('Contenido').fill('La clave de consulta es zarzamora. El presupuesto de prueba es de treinta unidades.')
  await page.getByRole('button', { name: 'Guardar ahora' }).click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}/)
  const noteUrl = page.url()
  await page.reload()
  await expect(page.getByLabel('Contenido')).toHaveValue(/zarzamora/)

  await page.goto('/library?upload=1')
  await page.getByLabel('Seleccionar archivo').setInputFiles({ name: 'beta-qa.txt', mimeType: 'text/plain', buffer: Buffer.from('El equipo seleccionó el proveedor B. El informe de prueba se entrega el viernes.') })
  await page.getByLabel('Título').fill('Documento de verificación beta')
  await page.getByRole('button', { name: 'Subir', exact: true }).click()
  await page.getByRole('link', { name: /Documento de verificación beta/ }).first().click()
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}/)
  const documentUrl = page.url()
  await page.getByRole('tab', { name: 'Contenido', exact: true }).click()
  await expect(page.getByText(/El equipo seleccionó el proveedor B/)).toBeVisible()
  const download = page.getByRole('link', { name: 'Abrir original' })
  await expect(download).toBeVisible()
  const signed = await download.getAttribute('href')
  expect(signed).toBeTruthy()
  const fileResponse = await page.request.get(new URL(signed!, baseURL).toString())
  expect(fileResponse.ok()).toBe(true)
  expect(await fileResponse.text()).toContain('proveedor B')

  await page.goto('/meetings/new')
  await expect(page.getByRole('button', { name: /Grabar reunión/ })).toHaveCount(0)
  await page.getByLabel('Título').fill('Reunión de verificación beta')
  await page.getByLabel('Transcripción').fill(OMEGA_TRANSCRIPT)
  await page.getByRole('button', { name: 'Importar y analizar' }).click()
  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}/)
  const meetingUrl = page.url()
  await waitForMeetingReady(page, meetingIdFromUrl(meetingUrl))
  await page.goto(`${meetingUrl}?t=0`)
  await expect(page.getByRole('tab', { name: 'Transcripción' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText(/Entonces vamos a seleccionar el proveedor B/)).toBeVisible()

  await page.goto('/ask')
  await page.getByLabel('Tu pregunta').fill('¿Cuál es la clave de consulta zarzamora?')
  await page.getByRole('button', { name: 'Preguntar' }).click()
  await expect(page.getByRole('link', { name: /Ver fuente/ }).first()).toBeVisible()

  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await page.getByLabel('Correo').fill(account.email)
  await page.getByLabel('Contraseña', { exact: true }).fill(account.password)
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard/)
  await page.goto(noteUrl)
  await expect(page.getByLabel('Contenido')).toHaveValue(/zarzamora/)

  const otherContext = await browser.newContext({ baseURL })
  const other = await otherContext.newPage()
  try {
    await register(other, 'Otra cuenta QA')
    for (const url of [noteUrl, documentUrl, meetingUrl]) {
      await other.goto(url)
      await expect(other.getByRole('heading', { name: /no encontramos|no existe|no disponible|404/i })).toBeVisible()
    }
    await other.goto('/search?q=zarzamora')
    await expect(other.getByRole('link', { name: /Nota de verificación beta/ })).toHaveCount(0)
  } finally {
    await otherContext.close()
  }
})

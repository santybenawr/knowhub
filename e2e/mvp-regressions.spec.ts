import { expect, test } from '@playwright/test'
import { completeOnboarding, signupAndOnboard } from './helpers'

test('typing during a slow first save persists the latest note without duplication', async ({ page }) => {
  await signupAndOnboard(page, 'Editor')
  await completeOnboarding(page, 'Proyecto de notas')
  await page.goto('/notes/new')
  let release!: () => void
  let held!: () => void
  const responseGate = new Promise<void>(resolve => { release = resolve })
  const firstResponse = new Promise<void>(resolve => { held = resolve })
  let intercepted = false
  await page.route('**/notes/new', async route => {
    if (intercepted || route.request().method() !== 'POST' || !route.request().headers()['next-action']) return route.continue()
    intercepted = true
    const response = await route.fetch()
    held()
    await responseGate
    await route.fulfill({ response })
  })
  await page.getByLabel('Título', { exact: true }).fill('Nota con guardado lento')
  await page.getByLabel('Contenido', { exact: true }).fill('Primera versión.')
  await page.getByRole('button', { name: 'Guardar ahora' }).click()
  await firstResponse
  try {
    await page.getByLabel('Contenido', { exact: true }).fill('Versión final que debe conservarse tras el guardado lento.')
    // Deliberately allow the 1.2 s autosave to fire while creation is in flight.
    await page.waitForTimeout(1500)
  } finally { release() }
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}/)
  await page.reload()
  await expect(page.getByLabel('Contenido', { exact: true })).toHaveValue('Versión final que debe conservarse tras el guardado lento.')
  await page.goto('/library')
  await expect(page.getByRole('link', { name: /Nota con guardado lento/ })).toHaveCount(1)
})

for (const scenario of [
  { body: '{"type":"error","value":"El proveedor falló."}\n', message: 'El proveedor falló.' },
  { body: '{"type":"status","value":"generating"}\n', message: 'La respuesta quedó incompleta. Intenta de nuevo.' },
]) {
  test(`ask preserves the error state: ${scenario.message}`, async ({ page }) => {
    await signupAndOnboard(page, 'Preguntas')
    await completeOnboarding(page, 'Errores')
    await page.goto('/ask')
    await page.route('**/api/ask', route => route.fulfill({
      status: 200, contentType: 'application/x-ndjson', body: scenario.body,
    }))
    await page.getByLabel('Tu pregunta').fill('¿Qué proveedor seleccionamos?')
    await page.getByRole('button', { name: 'Preguntar', exact: true }).click()
    await expect(page.getByText(scenario.message, { exact: true })).toBeVisible()
    await page.getByLabel('Tu pregunta').fill('¿Podemos reintentar?')
    await expect(page.getByRole('button', { name: 'Preguntar', exact: true })).toBeEnabled()
  })
}

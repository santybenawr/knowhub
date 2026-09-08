import { expect, test } from '@playwright/test'

test('el prelanzamiento muestra la demo sin ofrecer cuentas o enviar preguntas a una API', async ({ page }) => {
  const apiRequests: string[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Menos buscar.Más conectar.')
  await expect(page.getByRole('link', { name: 'Explorar demo', exact: true }).first()).toHaveAttribute('href', '/#demo')
  await expect(page.locator('a[href="/signup"], a[href="/login"]')).toHaveCount(0)
  await page.getByRole('button', { name: 'Revelar respuesta', exact: true }).click()
  await expect(page.getByText('El equipo eligió al proveedor B para avanzar con el proyecto.')).toBeVisible()
  await page.getByRole('button', { name: 'Abrir fuente 1, minuto 01:38', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Aquí quedó la decisión.' })).toBeFocused()
  await expect(page.locator('#demo-source')).toHaveAttribute('data-open', 'true')
  await expect(page.locator('#demo-source blockquote')).toContainText('01:38 Santiago')
  await expect(page.locator('#demo-source blockquote')).toContainText('Entonces vamos a seleccionar el proveedor B.')
  await page.getByRole('button', { name: 'Reiniciar demo', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Revelar respuesta', exact: true })).toBeVisible()
  expect(apiRequests).toEqual([])
})

test('el movimiento puede pausarse y respeta cambios de preferencia', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar animaciones', exact: true }).click()
  await expect(page.locator('[data-paused]')).toHaveAttribute('data-paused', 'true')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('[data-reduced]')).toHaveAttribute('data-reduced', 'true')
  await expect(page.getByRole('button', { name: 'Reanudar animaciones' })).toBeHidden()
  await expect(page.locator('main img')).toHaveCSS('animation-name', 'none')
})

test('320, 390, 768 y 1440 px mantienen el contenido dentro de la pantalla', async ({ page }) => {
  await page.goto('/')
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test('la narrativa, la fuente y los enlaces siguen disponibles sin JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('http://127.0.0.1:3033/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('noscript').last()).toContainText('El equipo eligió al proveedor B')
  await page.getByRole('link', { name: 'Privacidad', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacidad de esta presentación')
  await context.close()
})

import { expect, test } from '@playwright/test'
import { completeOnboarding, login, signupAndOnboard } from './helpers'

test('TXT from Windows remains readable, labeled and filterable together with a project', async ({ page }) => {
  test.setTimeout(90_000)
  await signupAndOnboard(page, 'Lectura')
  await completeOnboarding(page, 'Biblioteca QA')
  await page.goto('/library?upload=1')
  const text = 'La organización definió el próximo envío para el miércoles. El presupuesto está aprobado. ' +
    'La planeación del proyecto incluye revisar los documentos antes de enviar el informe final. ' +
    'El equipo conservará una copia de las decisiones para consultar las fuentes durante el seguimiento.'
  await page.getByLabel('Seleccionar archivo').setInputFiles({ name: 'decisiones.TXT', mimeType: 'text/plain', buffer: Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, 'utf16le')]) })
  await page.getByLabel('Título', { exact: true }).fill('Decisiones del equipo')
  const projectSelect = page.getByLabel('Proyecto', { exact: true })
  await projectSelect.selectOption({ label: 'Biblioteca QA' })
  const projectId = await projectSelect.inputValue()
  await page.getByRole('button', { name: 'Subir', exact: true }).click()
  const card = page.getByRole('link', { name: /Decisiones del equipo/ })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Texto · TXT')
  await card.click()
  await page.getByRole('tab', { name: 'Contenido' }).click()
  await expect(page.getByRole('tabpanel').getByText(text, { exact: true })).toBeVisible({ timeout: 30_000 })

  await page.goto('/library')
  await page.getByRole('button', { name: 'Biblioteca QA', exact: true }).click()
  for (const name of ['Notas', 'Reuniones']) {
    await page.getByRole('button', { name, exact: true }).click()
    await expect(page.getByRole('heading', { name: 'No hay contenido con estos filtros.' })).toBeVisible()
    await expect(page).toHaveURL(new RegExp(`project=${projectId}`))
  }
  await page.getByRole('button', { name: 'Documentos', exact: true }).click()
  await page.getByLabel('Formato de documento').selectOption('txt')
  await expect(page.getByRole('link', { name: /Decisiones del equipo/ })).toBeVisible()
  await page.getByLabel('Formato de documento').selectOption('pdf')
  await expect(page.getByRole('heading', { name: 'No hay contenido con estos filtros.' })).toBeVisible()
  await page.getByRole('link', { name: 'Quitar filtros' }).click()
  await expect(page.getByRole('link', { name: /Decisiones del equipo/ })).toBeVisible()

  // Query-string tampering or an outdated bookmark must not crash UUID SQL.
  await page.goto('/library?kind=note&project=undefined&format=pdf')
  await expect(page.getByRole('heading', { name: 'Biblioteca', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Algo salió mal/ })).toHaveCount(0)
})

test('creating a note from a project keeps its organization and saves before navigating away', async ({ page }) => {
  await signupAndOnboard(page, 'Organizacion')
  await completeOnboarding(page, 'Proyecto de notas')
  await page.goto('/projects')
  await page.getByRole('link', { name: /Proyecto de notas/ }).first().click()
  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]{36}$/)
  const projectUrl = page.url()
  const projectId = projectUrl.split('/').at(-1)!
  await page.getByRole('link', { name: 'Nota', exact: true }).click()
  await expect(page.getByLabel('Proyecto', { exact: true })).toHaveValue(projectId)
  await page.getByLabel('Título', { exact: true }).fill('Sin perder el borrador')
  await page.getByLabel('Contenido', { exact: true }).fill('La última edición debe conservarse al abrir la biblioteca inmediatamente.')
  await page.getByRole('link', { name: 'Biblioteca', exact: true }).first().click()
  await expect(page).toHaveURL(/\/library$/)
  const card = page.getByRole('link', { name: /Sin perder el borrador/ })
  await expect(card).toBeVisible()
  await expect(card).toContainText('Proyecto de notas')
  await card.click()
  await expect(page.getByLabel('Contenido', { exact: true })).toHaveValue('La última edición debe conservarse al abrir la biblioteca inmediatamente.')
  await page.getByLabel('Contenido', { exact: true }).fill('Edición después de usar el enlace de accesibilidad.')
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido', exact: true })
  await skipLink.focus()
  await skipLink.press('Enter')
  await expect(page.getByLabel('Contenido', { exact: true })).toBeEnabled()
  await page.getByLabel('Contenido', { exact: true }).fill('El editor continúa disponible después de saltar al contenido.')
  await page.getByRole('button', { name: 'Guardar ahora' }).click()
  await expect(page.getByText('Guardado', { exact: true })).toBeVisible()
  await page.goto(projectUrl)
  await expect(page.getByRole('link', { name: /Sin perder el borrador/ })).toBeVisible()
})

test('document citations open the extracted content even when a summary exists', async ({ page }) => {
  await signupAndOnboard(page, 'Fuentes')
  await completeOnboarding(page, 'Evidencias')
  const text = 'La propuesta de valor de KnowHub consiste en organizar documentos, notas y reuniones para recuperar información con sus fuentes. ' +
    'El equipo definió que el presupuesto aprobado para el proyecto es de cinco millones de pesos. ' +
    'Los documentos conservan su texto para que cada consulta pueda verificarse en el contenido original.'
  const response = await page.request.post('/api/documents/upload', { multipart: { file: { name: 'presupuesto.txt', mimeType: 'text/plain', buffer: Buffer.from(text) }, title: 'Presupuesto aprobado' } })
  expect(response.ok()).toBe(true)
  const { documentId } = await response.json() as { documentId: string }
  await page.goto(`/documents/${documentId}`)
  await page.getByRole('tab', { name: 'Contenido', exact: true }).click()
  await expect(page.getByRole('tabpanel').getByText(text, { exact: true })).toBeVisible({ timeout: 30_000 })
  await page.goto('/ask')
  await page.getByLabel('Tu pregunta').fill('¿Cuál es el presupuesto aprobado para el proyecto?')
  await page.getByRole('button', { name: 'Preguntar', exact: true }).click()
  const citation = page.getByRole('link', { name: /Ver fuente 1/ }).first()
  await expect(citation).toBeVisible()
  await citation.click()
  await expect(page).toHaveURL(new RegExp(`/documents/${documentId}\\?chunk=`))
  await expect(page.getByRole('tab', { name: 'Contenido', exact: true })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tabpanel').getByText(text, { exact: true })).toBeVisible()
})

test('command palette waits for both the in-flight note save and the latest edit', async ({ page }) => {
  await signupAndOnboard(page, 'Comandos')
  await completeOnboarding(page, 'Navegación segura')
  await page.goto('/notes/new')
  let release!: () => void
  let held!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  const firstResponse = new Promise<void>(resolve => { held = resolve })
  let intercepted = false
  await page.route('**/notes/new', async route => {
    if (intercepted || route.request().method() !== 'POST' || !route.request().headers()['next-action']) return route.continue()
    intercepted = true
    const response = await route.fetch()
    held()
    await gate
    await route.fulfill({ response })
  })
  await page.getByLabel('Título', { exact: true }).fill('Nota desde la paleta')
  await page.getByLabel('Contenido', { exact: true }).fill('Versión inicial.')
  await page.getByRole('button', { name: 'Guardar ahora' }).click()
  await firstResponse
  try {
    await page.getByLabel('Contenido', { exact: true }).fill('La última edición sobrevive a la paleta de comandos.')
    await page.keyboard.press('ControlOrMeta+k')
    await page.getByRole('option', { name: /Buscar/ }).click()
    await expect(page.getByLabel('Contenido', { exact: true })).toBeDisabled()
    await expect(page).toHaveURL(/\/notes\/new$/)
  } finally { release() }
  await expect(page).toHaveURL(/\/search$/)
  await page.goto('/library')
  await expect(page.getByRole('link', { name: /Nota desde la paleta/ })).toHaveCount(1)
  await page.getByRole('link', { name: /Nota desde la paleta/ }).click()
  await expect(page.getByLabel('Contenido', { exact: true })).toHaveValue('La última edición sobrevive a la paleta de comandos.')
})

test('logout saves a new note before destroying the session', async ({ page }) => {
  const email = await signupAndOnboard(page, 'Salida')
  await completeOnboarding(page, 'Notas conservadas')
  await page.goto('/notes/new')
  await page.getByLabel('Título', { exact: true }).fill('Nota antes de cerrar sesión')
  await page.getByLabel('Contenido', { exact: true }).fill('Este texto debe estar guardado cuando vuelva a entrar.')
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, email)
  await page.goto('/library')
  await page.getByRole('link', { name: /Nota antes de cerrar sesión/ }).click()
  await expect(page.getByLabel('Contenido', { exact: true })).toHaveValue('Este texto debe estar guardado cuando vuelva a entrar.')
})

test('browser back flushes a draft without replacing the destination with the created note', async ({ page }) => {
  await signupAndOnboard(page, 'Historial')
  await completeOnboarding(page, 'Notas al volver')
  await page.goto('/library')
  await page.getByRole('link', { name: 'Crear nota', exact: true }).click()
  await expect(page).toHaveURL(/\/notes\/new$/)
  await page.getByLabel('Título', { exact: true }).fill('Borrador antes de volver')
  await page.getByLabel('Contenido', { exact: true }).fill('El botón atrás también conserva esta edición pendiente.')
  const saved = page.waitForResponse(response => response.request().method() === 'POST' && Boolean(response.request().headers()['next-action']))
  await page.goBack()
  await expect(page).toHaveURL(/\/library$/)
  await saved
  await page.reload()
  await page.getByRole('link', { name: /Borrador antes de volver/ }).click()
  await expect(page.getByLabel('Contenido', { exact: true })).toHaveValue('El botón atrás también conserva esta edición pendiente.')
})

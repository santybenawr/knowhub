import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
  await page.goto('/#/dashboard')
  await expect(
    page.getByRole('heading', { name: 'Hola, Visitante' }),
  ).toBeVisible()
})
test('navigation, responsive layout and standalone links', async ({
  page,
  isMobile,
}) => {
  await page
    .getByRole('link', { name: 'Explorar reunión', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Reunión Proyecto Emprendimiento' }),
  ).toBeVisible()
  await expect(page.locator('body')).toHaveJSProperty(
    'scrollWidth',
    await page.evaluate(() => window.innerWidth),
  )
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
    await page.getByRole('link', { name: 'Guía de la demo' }).click()
  } else await page.getByRole('link', { name: 'Guía de la demo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Explora KnowHub' }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Explora KnowHub' }),
  ).toBeVisible()
})
test('meeting evidence, transcript selection and task completion persist', async ({
  page,
}) => {
  await page.goto('/#/resource/reunion-emprendimiento')
  await page.getByRole('tab', { name: 'Decisiones', exact: true }).click()
  await page.getByRole('link', { name: 'Ver fuente · 01:38' }).click()
  await expect(
    page.getByRole('tab', { name: 'Transcripción' }),
  ).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('#source-2')).toContainText(
    'Decidimos seleccionar al proveedor B',
  )
  await expect(page.locator('#source-2')).toHaveClass(/source-active/)
  await page.getByRole('tab', { name: 'Pendientes', exact: true }).click()
  const task = page.getByRole('checkbox', { name: /Completar: Solicitar/ })
  await task.check()
  await page.reload()
  await page.getByRole('tab', { name: 'Pendientes', exact: true }).click()
  await expect(task).toBeChecked()
})
test('queries cite real example text, abstain and respect project scope', async ({
  page,
}) => {
  await page.goto('/#/ask')
  await page
    .getByRole('button', {
      name: '¿Qué proveedor vamos a seleccionar?',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('region', { name: 'Resultado de la consulta' }),
  ).toContainText('proveedor B')
  await page.getByRole('link', { name: /Fuente 1:/ }).click()
  await expect(
    page.getByRole('tab', { name: 'Transcripción' }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.goto('/#/ask')
  await page
    .getByRole('button', {
      name: '¿Cuál es la temperatura de Neptuno?',
      exact: true,
    })
    .click()
  await expect(
    page.getByText(
      'No encontré evidencia suficiente en las fuentes seleccionadas.',
    ),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: /Fuente 1:/ })).toHaveCount(0)
  await page
    .getByRole('combobox', { name: 'Consultar en', exact: true })
    .selectOption('Finanzas')
  await page
    .getByRole('button', {
      name: '¿Qué proveedor vamos a seleccionar?',
      exact: true,
    })
    .click()
  await expect(
    page.getByText(
      'No encontré evidencia suficiente en las fuentes seleccionadas.',
    ),
  ).toBeVisible()
})
test('notes persist on reload, stay isolated and reset safely', async ({
  page,
  browser,
}) => {
  await page.getByRole('link', { name: /Crear nota Guarda/ }).click()
  await page
    .getByLabel('Título', { exact: true })
    .fill('Nota ficticia de exposición')
  await page.getByRole('button', { name: 'Crear nota', exact: true }).click()
  await page
    .getByLabel('Contenido de la nota')
    .fill('El presupuesto del prototipo es de 500 pesos ficticios.')
  await page.reload()
  await expect(page.getByLabel('Contenido de la nota')).toHaveValue(
    'El presupuesto del prototipo es de 500 pesos ficticios.',
  )
  await page.goto('/#/search')
  await page
    .getByRole('searchbox', { name: 'Buscar', exact: true })
    .fill('500 pesos')
  await expect(
    page.getByRole('link', { name: /Nota ficticia de exposición/ }),
  ).toBeVisible()
  const other = await browser.newContext()
  const otherPage = await other.newPage()
  await otherPage.goto(new URL('/#/library', page.url()).href)
  await expect(
    otherPage.getByRole('heading', { name: 'Biblioteca', exact: true }),
  ).toBeVisible()
  await expect(
    otherPage.getByRole('link', { name: /Nota ficticia de exposición/ }),
  ).toHaveCount(0)
  await other.close()
  await page
    .getByRole('button', { name: 'Reiniciar demo', exact: true })
    .click()
  await page.getByRole('button', { name: 'Restaurar ejemplos' }).click()
  await page.goto('/#/library')
  await expect(
    page.getByRole('link', { name: /Nota ficticia de exposición/ }),
  ).toHaveCount(0)
})
test('projects, examples, theme and missing routes', async ({ page }) => {
  await page.goto('/#/projects')
  await page.getByLabel('Nombre del nuevo proyecto').fill('Proyecto demo')
  await page.getByRole('button', { name: 'Crear proyecto' }).click()
  await expect(
    page.getByRole('heading', { name: 'Proyecto demo' }),
  ).toBeVisible()
  await page.goto('/#/add-document')
  await expect(
    page.getByText(/La carga de archivos personales no está habilitada/),
  ).toBeVisible()
  await page.getByLabel('Título', { exact: true }).fill('Documento ficticio')
  await page
    .getByRole('combobox', { name: 'Proyecto', exact: true })
    .selectOption('Proyecto demo')
  await page.getByRole('button', { name: 'Usar ejemplo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Documento ficticio' }),
  ).toBeVisible()
  await page.getByRole('tab', { name: 'Contenido', exact: true }).click()
  await expect(
    page.getByText(/El modelo Canvas es una herramienta/),
  ).toBeVisible()
  await page.goto('/#/new-meeting')
  await page.getByRole('button', { name: 'Usar ejemplo' }).click()
  await expect(
    page.getByRole('heading', { name: 'Reunión de prueba' }),
  ).toBeVisible()
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'Oscuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.reload()
  await expect(page.locator('html')).toHaveClass('dark')
  await page.goto('/#/resource/missing')
  await expect(
    page.getByRole('heading', { name: 'Este recurso no está en tu sesión' }),
  ).toBeVisible()
})

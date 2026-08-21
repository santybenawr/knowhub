import { expect, test } from '@playwright/test'
import { completeOnboarding, signupAndOnboard } from './helpers'

/**
 * §151 Flow 1 — Signup → onboarding → project → note → search → ask → citation.
 */
test('a new account can capture a note and recall it with a citation', async ({ page }) => {
  await signupAndOnboard(page, 'Santiago')
  await completeOnboarding(page, 'Proyecto Omega')

  await expect(page.getByRole('heading', { name: '¿Qué quieres recordar hoy?' })).toBeVisible()

  // --- create a note ------------------------------------------------------
  await page.goto('/notes/new')
  await page.getByLabel('Título').fill('Decisión de proveedor')
  await page
    .getByLabel('Contenido')
    .fill(
      'Después de comparar tres propuestas, el equipo decidió seleccionar el proveedor B ' +
        'por sus condiciones de soporte técnico y su precio más bajo en el primer año.',
    )
  await page.getByRole('button', { name: 'Guardar ahora' }).click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}/, { timeout: 20_000 })

  // --- it becomes searchable ---------------------------------------------
  await expect
    .poll(
      async () => {
        await page.goto('/search?q=proveedor')
        return page.getByRole('link', { name: /Decisión de proveedor/ }).count()
      },
      { timeout: 30_000, intervals: [1000, 2000] },
    )
    .toBeGreaterThan(0)

  // --- and answerable, with a source ---------------------------------------
  await page.goto('/ask')
  await page.getByLabel('Tu pregunta').fill('¿Qué proveedor seleccionamos?')
  await page.getByRole('button', { name: 'Preguntar' }).click()

  await expect(page.getByText('Fuentes')).toBeVisible({ timeout: 30_000 })
  const source = page.getByRole('link', { name: /Ver fuente 1/ }).first()
  await expect(source).toBeVisible()

  // §113 — the citation opens the evidence.
  await source.click()
  await expect(page).toHaveURL(/\/notes\/[0-9a-f-]{36}/)
})

/**
 * §151 Flow 2 — Login → upload document → process → view summary.
 */
test('an uploaded document is processed and summarised', async ({ page }) => {
  await signupAndOnboard(page, 'Laura')
  await completeOnboarding(page, 'Curso')

  await page.goto('/library?upload=1')

  const content = [
    'Principios administrativos',
    '',
    'La planeación define objetivos y los cursos de acción para alcanzarlos.',
    'La organización distribuye el trabajo, la autoridad y los recursos entre las áreas.',
    'La dirección influye en las personas para que contribuyan a los objetivos comunes.',
    'El control compara los resultados obtenidos con los planeados y corrige desviaciones.',
  ].join('\n')

  await page.getByLabel('Seleccionar archivo').setInputFiles({
    name: 'principios.md',
    mimeType: 'text/markdown',
    buffer: Buffer.from(content, 'utf8'),
  })
  await page.getByLabel('Título').fill('Principios Administrativos')
  await page.getByRole('button', { name: 'Subir', exact: true }).click()

  await expect(page.getByRole('link', { name: /Principios Administrativos/ })).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole('link', { name: /Principios Administrativos/ }).first().click()
  await expect(page).toHaveURL(/\/documents\/[0-9a-f-]{36}/)

  // The extracted text is visible, which is what makes a citation checkable.
  await page.getByRole('tab', { name: 'Contenido' }).click()
  await expect(page.getByText(/La planeación define objetivos/)).toBeVisible({ timeout: 30_000 })
})

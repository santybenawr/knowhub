import { expect, test } from '@playwright/test'
import { login, signupAndOnboard } from './helpers'

test('omitting onboarding persists after logout and the guide is reachable on desktop and mobile', async ({ page }) => {
  const email = await signupAndOnboard(page, 'Guia')
  await page.getByRole('button', { name: 'Omitir', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.getByRole('link', { name: 'Ayuda y guía', exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: 'Ayuda y guía', exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Crear mi primera nota' }).click()
  await expect(page).toHaveURL(/\/notes\/new$/)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  await login(page, email)
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('link', { name: 'Ayuda y guía', exact: true }).filter({ visible: true }).click()
  await expect(page.getByRole('heading', { name: 'Cómo usar cada función' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buscar en mi contenido' })).toBeVisible()
})

test('registration introduces the real workflow before entering the app', async ({ page }) => {
  await signupAndOnboard(page, 'Primerospasos')
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cómo usar KnowHub', exact: true })).toBeFocused()
  await expect(page.getByRole('heading', { name: '1. Guarda algo que quieras recordar' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '2. Encuéntralo en tu biblioteca' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '3. Pregunta y comprueba la fuente' })).toBeVisible()
  await page.getByRole('button', { name: 'Entrar a KnowHub', exact: true }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})

import { expect, test } from '@playwright/test'
import {
  completeOnboarding,
  meetingIdFromUrl,
  OMEGA_TRANSCRIPT,
  signupAndOnboard,
  waitForMeetingReady,
  wavFixture,
} from './helpers'

/**
 * §151 Flow 3 / §213 — The product test.
 *
 * Capture a meeting, let KnowHub understand it, ask about it, and land back on
 * the exact moment in the source. Runs without a microphone: CI uploads a real
 * WAV fixture, and the transcript-import path covers the same pipeline with
 * real speaker names and timestamps.
 */
test('an uploaded recording becomes a transcript, decisions and a timestamped answer', async ({
  page,
}) => {
  await signupAndOnboard(page, 'Carlos')
  await completeOnboarding(page, 'Proyecto Omega')

  await page.goto('/meetings')
  await expect(page.getByText('Tus conversaciones importantes')).toBeVisible()

  // The page offers this action twice when the list is empty (header + empty
  // state); either is fine.
  await page.getByRole('link', { name: 'Grabar reunión' }).first().click()
  await expect(page).toHaveURL(/\/meetings\/new/)

  // --- upload a real audio file ------------------------------------------
  await page.getByRole('button', { name: /Subir grabación/ }).first().click()
  await page.getByLabel('Título').fill('Reunión Proyecto Omega')
  await page.getByLabel('Archivo de audio').setInputFiles({
    name: 'reunion.wav',
    mimeType: 'audio/wav',
    buffer: wavFixture(3),
  })
  await page.getByRole('button', { name: 'Subir y transcribir' }).click()

  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 60_000 })
  const meetingId = meetingIdFromUrl(page.url())
  await waitForMeetingReady(page, meetingId)

  await page.reload()

  // --- the transcript exists, with clickable timestamps -------------------
  await page.getByRole('tab', { name: 'Transcripción' }).click()
  const timestamp = page.getByRole('button', { name: /Reproducir desde/ }).first()
  await expect(timestamp).toBeVisible({ timeout: 30_000 })

  // §74 — audio is available and playable.
  // `exact` because every transcript line also exposes "Reproducir desde mm:ss".
  await expect(page.getByRole('button', { name: 'Reproducir', exact: true })).toBeVisible()

  // §182 — clicking a timestamp seeks the player rather than navigating away.
  await timestamp.click()
  await expect(page).toHaveURL(new RegExp(`/meetings/${meetingId}`))
})

test('an imported transcript yields decisions and action items with real sources', async ({ page }) => {
  await signupAndOnboard(page, 'Ana')
  await completeOnboarding(page, 'Proyecto Omega')

  await page.goto('/meetings/new')
  await page.getByRole('button', { name: /Importar transcripción/ }).first().click()
  await page.getByLabel('Título').fill('Reunión Proyecto Omega')
  await page.getByLabel('Transcripción').fill(OMEGA_TRANSCRIPT)
  await page.getByRole('button', { name: 'Importar y analizar' }).click()

  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 60_000 })
  const meetingId = meetingIdFromUrl(page.url())
  await waitForMeetingReady(page, meetingId)
  await page.reload()

  // --- decisions, traceable to the transcript -----------------------------
  await page.getByRole('tab', { name: /Decisiones/ }).click()
  await expect(page.getByText(/proveedor B/)).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /Fuente/ }).first()).toBeVisible()

  // --- action items, with what was said and what was not (§93) ------------
  await page.getByRole('tab', { name: /Pendientes/ }).click()
  await expect(page.getByText(/contacto al proveedor/)).toBeVisible()
  await expect(page.getByText('Laura', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('Responsable no especificado').first()).toBeVisible()

  // --- ask the meeting, and get a source back ------------------------------
  await page.getByRole('tab', { name: 'Preguntar' }).click()
  await page.getByLabel('Tu pregunta').fill('¿Qué proveedor seleccionamos?')
  await page.getByRole('button', { name: 'Preguntar' }).click()

  await expect(page.getByText('Fuentes')).toBeVisible({ timeout: 30_000 })
  await expect(page.getByRole('button', { name: /Ver fuente 1/ }).first()).toBeVisible()

  // --- and the transcript is still the source of truth --------------------
  await page.getByRole('tab', { name: 'Transcripción' }).click()
  await expect(page.getByText(/Entonces vamos a seleccionar el proveedor B/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Santiago' })).toBeVisible()
})

/** §150 — Isolation, verified through the HTTP surface. */
test('one account cannot open another account meeting', async ({ page, browser }) => {
  await signupAndOnboard(page, 'Owner')
  await completeOnboarding(page, 'Privado')

  await page.goto('/meetings/new')
  await page.getByRole('button', { name: /Importar transcripción/ }).first().click()
  await page.getByLabel('Título').fill('Reunión privada')
  await page.getByLabel('Transcripción').fill(OMEGA_TRANSCRIPT)
  await page.getByRole('button', { name: 'Importar y analizar' }).click()
  await expect(page).toHaveURL(/\/meetings\/[0-9a-f-]{36}/, { timeout: 60_000 })
  const meetingId = meetingIdFromUrl(page.url())

  // A second, unrelated account in a clean browser context.
  const context = await browser.newContext()
  const intruder = await context.newPage()
  await signupAndOnboard(intruder, 'Intruder')
  await completeOnboarding(intruder, 'Otro')

  await intruder.goto(`/meetings/${meetingId}`)
  await expect(intruder.getByText('No encontramos esta página')).toBeVisible()

  const status = await intruder.request.get(`/api/meetings/${meetingId}/status`)
  expect(status.status()).toBe(404)

  await context.close()
})

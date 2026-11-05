import { expect, test } from '@playwright/test'

test('the brand loads on registration in light and dark themes and on mobile', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/signup')
  const logo = page.getByRole('img', { name: 'KnowHub', exact: true })
  await expect(logo).toBeVisible()
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 1)).toBe(true)
  await page.getByRole('radio', { name: 'Claro', exact: true }).click()
  await page.screenshot({ path: testInfo.outputPath('registro-logo-claro.png'), animations: 'disabled' })
  await page.getByRole('radio', { name: 'Oscuro', exact: true }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.screenshot({ path: testInfo.outputPath('registro-logo-oscuro.png'), animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(logo).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.screenshot({ path: testInfo.outputPath('registro-logo-movil.png'), animations: 'disabled' })
  expect(errors).toEqual([])
})

test('install and Apple icons contain real images matching their declared dimensions', async ({ page, request }) => {
  await page.goto('/signup')
  const manifestUrl = await page.locator('link[rel="manifest"]').getAttribute('href')
  const response = await request.get(manifestUrl!)
  expect(response.ok()).toBe(true)
  const manifest = await response.json() as { icons: Array<{ src: string; sizes: string }> }
  const apple = page.locator('link[rel="apple-touch-icon"]')
  const icons = [...manifest.icons, { src: (await apple.getAttribute('href'))!, sizes: (await apple.getAttribute('sizes'))! }]
  for (const icon of icons) {
    const image = await request.get(icon.src)
    expect(image.ok()).toBe(true)
    const png = await image.body()
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    const [width, height] = icon.sizes.split('x').map(Number)
    expect(png.readUInt32BE(16)).toBe(width)
    expect(png.readUInt32BE(20)).toBe(height)
    expect(png.length).toBeGreaterThan(1_000)
  }
})

import { defineConfig, devices } from '@playwright/test'

const PORT = 3011
const BASE_URL = `http://127.0.0.1:${PORT}`

/**
 * §151 — End-to-end tests.
 *
 * The suite runs against a production build on its own database and storage
 * directory, so it never touches development data. No microphone is required:
 * the recording *logic* is covered by the unit tests over the state machine
 * (§199), and the audio path here is exercised by uploading a real WAV fixture.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    locale: 'es-CO',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next build --webpack && node node_modules/next/dist/bin/next start --hostname 127.0.0.1 -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: '',
      STORAGE_PROVIDER: 'local',
      OPENAI_API_KEY: '',
      TRANSCRIPTION_API_KEY: '',
      STRIPE_SECRET_KEY: '',
      PGLITE_DATA_DIR: '.data/e2e-pglite',
      STORAGE_LOCAL_DIR: '.data/e2e-storage',
      AUTH_SECRET: 'e2e-secret-value-long-enough-to-satisfy-validation',
      AUTH_PROVIDER: 'local',
      AI_PROVIDER: 'mock',
      TRANSCRIPTION_PROVIDER: 'mock',
      NEXT_PUBLIC_APP_URL: BASE_URL,
      // The whole suite drives the app from one address, which the per-IP
      // limiter would (correctly) block after a handful of signups.
      RATE_LIMIT_MULTIPLIER: '1000',
    },
  },
})

import { defineConfig, devices } from '@playwright/test'

const remote = process.env.KNOWHUB_BETA_URL
const baseURL = remote || 'http://127.0.0.1:3013'

export default defineConfig({
  testDir: './e2e-beta',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  use: { baseURL, trace: 'off', locale: 'es-CO', ...devices['Desktop Chrome'] },
  ...(remote ? {} : {
    webServer: {
      command: 'pnpm exec next build --webpack && pnpm exec next start --hostname 127.0.0.1 --port 3013',
      url: `${baseURL}/login`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NODE_ENV: 'production', VERCEL: '0', NEXT_PUBLIC_KNOWHUB_BETA: 'true',
        DATABASE_URL: '', DATABASE_AUTO_MIGRATE: 'true', AUTH_PROVIDER: 'local',
        PGLITE_DATA_DIR: '.data/beta-e2e/database', STORAGE_LOCAL_DIR: '.data/beta-e2e/storage',
        STORAGE_PROVIDER: 'local', AUTH_SECRET: 'beta-e2e-secret-not-for-any-public-deployment',
        AI_PROVIDER: 'mock', TRANSCRIPTION_PROVIDER: 'mock', OPENAI_API_KEY: '',
        TRANSCRIPTION_API_KEY: '', STRIPE_SECRET_KEY: '', MAX_UPLOAD_MB: '4',
        NEXT_PUBLIC_APP_URL: baseURL, RATE_LIMIT_MULTIPLIER: '1000',
      },
    },
  }),
})

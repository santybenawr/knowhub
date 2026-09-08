import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:3033', locale: 'es-CO', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'python3 -m http.server 3033 --bind 127.0.0.1 --directory marketing/out',
    cwd: '..',
    url: 'http://127.0.0.1:3033',
    reuseExistingServer: !process.env.CI,
  },
})

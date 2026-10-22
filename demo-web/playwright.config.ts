import { defineConfig, devices } from '@playwright/test'
const remote = process.env.DEMO_BASE_URL
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: remote ?? 'http://127.0.0.1:3012',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
  ],
  webServer: remote
    ? undefined
    : {
        command: 'node scripts/serve-demo-web.mjs',
        cwd: '..',
        url: 'http://127.0.0.1:3012',
        reuseExistingServer: false,
      },
})

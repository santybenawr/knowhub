import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Each file gets its own worker, and therefore its own in-memory Postgres.
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
})

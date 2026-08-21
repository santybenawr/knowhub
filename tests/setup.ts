/**
 * Test environment.
 *
 * Every run gets an in-memory Postgres (PGlite) and the deterministic mock
 * providers, so the suite never touches the network and never depends on
 * credentials. `AI_PROVIDER`/`TRANSCRIPTION_PROVIDER` are set explicitly rather
 * than left to fall back, matching how production must opt in (§78).
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  PGLITE_DATA_DIR: 'memory://',
  AI_PROVIDER: 'mock',
  TRANSCRIPTION_PROVIDER: 'mock',
  STORAGE_PROVIDER: 'local',
  STORAGE_LOCAL_DIR: '.data/test-storage',
  AUTH_SECRET: 'test-secret-value-that-is-long-enough-to-pass-validation',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3010',
})

delete process.env.DATABASE_URL
delete process.env.OPENAI_API_KEY
delete process.env.TRANSCRIPTION_API_KEY

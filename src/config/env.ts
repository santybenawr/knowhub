import { z } from 'zod'

/**
 * §144/§145 — Environment validation.
 *
 * Two schemas: `serverEnv` may only be imported from server code; `clientEnv`
 * holds the handful of NEXT_PUBLIC_* values that are safe in the browser.
 * Everything is optional-with-a-default so the app boots with zero credentials
 * (falling back to the local/mock providers) instead of crashing.
 */

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')

const int = (fallback: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const n = v === undefined || v === '' ? NaN : Number(v)
      return Number.isFinite(n) && n > 0 ? n : fallback
    })

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Database. Absent => embedded PGlite (dev/test/CI, zero external services).
  DATABASE_URL: z.string().optional(),
  PGLITE_DATA_DIR: z.string().default('.data/pglite'),

  // Auth
  AUTH_SECRET: z.string().optional(),
  AUTH_PROVIDER: z.enum(['local', 'supabase']).default('local'),

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 'supabase']).default('local'),
  STORAGE_LOCAL_DIR: z.string().default('.data/storage'),

  // Supabase (optional)
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('knowhub-private'),

  // AI
  AI_PROVIDER: z.enum(['openai', 'mock']).optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSIONS: int(1536),

  // Transcription
  TRANSCRIPTION_PROVIDER: z.enum(['openai', 'mock']).optional(),
  TRANSCRIPTION_API_KEY: z.string().optional(),
  TRANSCRIPTION_BASE_URL: z.string().default('https://api.openai.com/v1'),
  TRANSCRIPTION_MODEL: z.string().default('whisper-1'),

  // Limits
  MAX_UPLOAD_MB: int(25),
  MAX_AUDIO_UPLOAD_MB: int(200),
  MAX_MEETING_DURATION_MINUTES: int(240),

  /**
   * Scales every rate limit. Exists because load tests and end-to-end suites
   * drive the whole app from a single IP, which is precisely what the limiter
   * is built to stop. Keep it at 1 in production.
   */
  RATE_LIMIT_MULTIPLIER: int(1),

  // Billing (optional; app must not break without it)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),

  // Observability
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),

  // Demo data (§146)
  ENABLE_DEMO_DATA: bool,

  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3010'),
})

export type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  cached = parsed.data
  return cached
}

/** Test helper: forget the memoised env after mutating process.env. */
export function resetServerEnvCache(): void {
  cached = null
}

/**
 * Which providers are actually live, derived once so the UI and docs can be
 * honest about running in mock mode (§78: never silently mock in production).
 */
export function getProviderStatus() {
  const env = getServerEnv()
  const aiProvider = env.AI_PROVIDER ?? (env.OPENAI_API_KEY ? 'openai' : 'mock')
  const transcriptionProvider =
    env.TRANSCRIPTION_PROVIDER ?? (env.TRANSCRIPTION_API_KEY || env.OPENAI_API_KEY ? 'openai' : 'mock')
  return {
    ai: aiProvider,
    transcription: transcriptionProvider,
    storage: env.STORAGE_PROVIDER,
    database: env.DATABASE_URL ? 'postgres' : 'pglite',
    billing: env.STRIPE_SECRET_KEY ? 'stripe' : 'none',
  } as const
}

export const clientEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3010',
}

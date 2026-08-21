import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getServerEnv } from '@/config/env'

let cached: string | null = null

/**
 * Signing secret for sessions and storage URLs.
 *
 * Production requires `AUTH_SECRET` explicitly — refusing to boot is better
 * than silently signing with an ephemeral key. In development the secret is
 * generated once and kept on disk so sessions survive a restart.
 */
export function getAuthSecret(): string {
  if (cached) return cached
  const env = getServerEnv()

  if (env.AUTH_SECRET && env.AUTH_SECRET.length >= 32) {
    cached = env.AUTH_SECRET
    return cached
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'AUTH_SECRET is required in production (at least 32 characters). Generate one with: openssl rand -base64 48',
    )
  }

  const file = join(dirname(env.PGLITE_DATA_DIR), 'dev-auth-secret')
  try {
    if (existsSync(file)) {
      cached = readFileSync(file, 'utf8').trim()
      if (cached.length >= 32) return cached
    }
    const generated = randomBytes(48).toString('base64url')
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, generated, { mode: 0o600 })
    cached = generated
    return cached
  } catch {
    // Read-only filesystem (some CI sandboxes): fall back to a per-process key.
    cached = randomBytes(48).toString('base64url')
    return cached
  }
}

export function resetAuthSecretCache(): void {
  cached = null
}

import { getServerEnv } from '@/config/env'
import { LocalStorageProvider } from './local'
import { SupabaseStorageProvider } from './supabase'
import type { StorageProvider } from './types'

export * from './types'
export * from './paths'
export { verifyLocalSignature } from './local'

let cached: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (cached) return cached
  const env = getServerEnv()
  cached = env.STORAGE_PROVIDER === 'supabase'
    ? SupabaseStorageProvider.fromEnv()
    : new LocalStorageProvider(env.STORAGE_LOCAL_DIR)
  return cached
}

/** Test seam. */
export function setStorageProvider(provider: StorageProvider | null): void {
  cached = provider
}

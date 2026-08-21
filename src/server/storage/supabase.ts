import { getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { assertSafeStoragePath } from './paths'
import type { SignedUrl, StorageProvider, StoredObject } from './types'

/**
 * Supabase Storage adapter.
 *
 * Talks to the Storage REST API directly with the service role key so no
 * additional SDK is pulled in (§171). The bucket must be created as **private**;
 * KnowHub never issues public URLs.
 */
export class SupabaseStorageProvider implements StorageProvider {
  readonly name = 'supabase'
  private readonly baseUrl: string
  private readonly serviceKey: string
  private readonly bucket: string

  constructor(config: { url: string; serviceKey: string; bucket: string }) {
    this.baseUrl = config.url.replace(/\/$/, '')
    this.serviceKey = config.serviceKey
    this.bucket = config.bucket
  }

  static fromEnv(): SupabaseStorageProvider {
    const env = getServerEnv()
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      throw providerError(
        'STORAGE_PROVIDER=supabase requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.',
      )
    }
    return new SupabaseStorageProvider({
      url: env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKey: env.SUPABASE_SERVICE_ROLE_KEY,
      bucket: env.SUPABASE_STORAGE_BUCKET,
    })
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.serviceKey}`,
      apikey: this.serviceKey,
      ...extra,
    }
  }

  async upload({ path, body, mimeType }: { path: string; body: Buffer | Uint8Array; mimeType: string }): Promise<StoredObject> {
    assertSafeStoragePath(path)
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': mimeType, 'x-upsert': 'true' }),
      body: new Uint8Array(buffer),
    })
    if (!res.ok) {
      throw providerError(`Supabase Storage rechazó la subida (${res.status}).`)
    }
    return { path, size: buffer.byteLength, mimeType }
  }

  async delete(path: string): Promise<void> {
    assertSafeStoragePath(path)
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`, {
      method: 'DELETE',
      headers: this.headers(),
    })
    if (!res.ok && res.status !== 404) {
      throw providerError(`Supabase Storage no pudo eliminar el objeto (${res.status}).`)
    }
  }

  async exists(path: string): Promise<boolean> {
    assertSafeStoragePath(path)
    const res = await fetch(`${this.baseUrl}/storage/v1/object/info/${this.bucket}/${path}`, {
      headers: this.headers(),
    })
    return res.ok
  }

  async read(path: string): Promise<{ body: Buffer; mimeType: string }> {
    assertSafeStoragePath(path)
    const res = await fetch(`${this.baseUrl}/storage/v1/object/${this.bucket}/${path}`, {
      headers: this.headers(),
    })
    if (!res.ok) throw providerError(`Supabase Storage no pudo leer el objeto (${res.status}).`)
    const buffer = Buffer.from(await res.arrayBuffer())
    return { body: buffer, mimeType: res.headers.get('content-type') ?? 'application/octet-stream' }
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<SignedUrl> {
    assertSafeStoragePath(path)
    const res = await fetch(`${this.baseUrl}/storage/v1/object/sign/${this.bucket}/${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ expiresIn: expiresInSeconds }),
    })
    if (!res.ok) throw providerError(`Supabase Storage no pudo firmar la URL (${res.status}).`)
    const json = (await res.json()) as { signedURL?: string }
    if (!json.signedURL) throw providerError('Supabase Storage devolvió una URL vacía.')
    return {
      url: `${this.baseUrl}/storage/v1${json.signedURL}`,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
    }
  }
}

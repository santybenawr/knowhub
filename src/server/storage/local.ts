import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { signPayload, verifySignature } from '@/lib/crypto'
import { getAuthSecret } from '@/server/auth/secret'
import { assertSafeStoragePath } from './paths'
import type { SignedUrl, StorageProvider, StoredObject } from './types'

/**
 * Filesystem-backed private storage.
 *
 * Files live outside `public/`, so nothing is reachable over HTTP by path.
 * Downloads go through `/api/storage/[...path]`, which verifies an HMAC
 * signature and an expiry before streaming — the same contract as a Supabase
 * signed URL, so swapping providers changes no calling code.
 */
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local'
  private readonly root: string

  constructor(root: string) {
    // The root is configuration, not user input, so it is resolved once here.
    // The bundler flags dynamic `resolve(cwd(), ...)` because it would
    // otherwise trace the whole project into the deployment; there is nothing
    // to trace at this call, so the tracing is opted out of explicitly.
    this.root = resolve(/* turbopackIgnore: true */ process.cwd(), root)
  }

  private absolute(path: string): string {
    assertSafeStoragePath(path)
    const abs = resolve(join(this.root, path))
    if (!abs.startsWith(this.root)) throw new Error('[knowhub] storage path escaped root')
    return abs
  }

  async upload({ path, body, mimeType }: { path: string; body: Buffer | Uint8Array; mimeType: string }): Promise<StoredObject> {
    const abs = this.absolute(path)
    await mkdir(dirname(abs), { recursive: true })
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body)
    await writeFile(abs, buffer, { mode: 0o600 })
    await writeFile(`${abs}.meta`, JSON.stringify({ mimeType }), { mode: 0o600 })
    return { path, size: buffer.byteLength, mimeType }
  }

  async delete(path: string): Promise<void> {
    const abs = this.absolute(path)
    await rm(abs, { force: true })
    await rm(`${abs}.meta`, { force: true })
  }

  async exists(path: string): Promise<boolean> {
    try {
      await stat(this.absolute(path))
      return true
    } catch {
      return false
    }
  }

  async read(path: string): Promise<{ body: Buffer; mimeType: string }> {
    const abs = this.absolute(path)
    const body = await readFile(abs)
    let mimeType = 'application/octet-stream'
    try {
      const meta = JSON.parse(await readFile(`${abs}.meta`, 'utf8')) as { mimeType?: string }
      if (meta.mimeType) mimeType = meta.mimeType
    } catch {
      // Metadata sidecar is best-effort.
    }
    return { body, mimeType }
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<SignedUrl> {
    assertSafeStoragePath(path)
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds
    const signature = signPayload(`${path}:${expires}`, getAuthSecret())
    const url = `/api/storage/${path}?expires=${expires}&signature=${signature}`
    return { url, expiresAt: new Date(expires * 1000) }
  }
}

/** Used by the storage route handler; returns false for tampered or stale URLs. */
export function verifyLocalSignature(path: string, expires: string, signature: string): boolean {
  const expiresAt = Number(expires)
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false
  return verifySignature(`${path}:${expiresAt}`, signature, getAuthSecret())
}

import { BlobNotFoundError, del, get, head, issueSignedToken, presignUrl, put } from '@vercel/blob'
import { getServerEnv } from '@/config/env'
import { providerError } from '@/lib/errors'
import { assertSafeStoragePath } from './paths'
import type { SignedUrl, StorageProvider, StoredObject } from './types'

/** Private objects use the same verified workspace paths as the other providers. */
export class VercelBlobStorageProvider implements StorageProvider {
  readonly name = 'vercel-blob'

  constructor(private readonly credentials: { token?: string; storeId?: string }) {}

  static fromEnv(): VercelBlobStorageProvider {
    const env = getServerEnv()
    if (!env.BLOB_READ_WRITE_TOKEN && !env.BLOB_STORE_ID) {
      throw providerError('Vercel Blob requiere un almacén privado conectado al proyecto.')
    }
    return new VercelBlobStorageProvider({ token: env.BLOB_READ_WRITE_TOKEN, storeId: env.BLOB_STORE_ID })
  }

  async upload({ path, body, mimeType }: { path: string; body: Buffer | Uint8Array; mimeType: string }): Promise<StoredObject> {
    assertSafeStoragePath(path)
    await put(path, Buffer.from(body), {
      ...this.credentials, access: 'private', contentType: mimeType,
      addRandomSuffix: false, allowOverwrite: true,
    })
    return { path, size: body.byteLength, mimeType }
  }

  async delete(path: string): Promise<void> {
    assertSafeStoragePath(path)
    await del(path, this.credentials)
  }

  async exists(path: string): Promise<boolean> {
    assertSafeStoragePath(path)
    try {
      await head(path, this.credentials)
      return true
    } catch (error) {
      if (error instanceof BlobNotFoundError) return false
      throw error
    }
  }

  async read(path: string): Promise<{ body: Buffer; mimeType: string }> {
    assertSafeStoragePath(path)
    const result = await get(path, { ...this.credentials, access: 'private', useCache: false })
    if (!result || result.statusCode !== 200) throw providerError('No encontramos el archivo privado.')
    return {
      body: Buffer.from(await new Response(result.stream).arrayBuffer()),
      mimeType: result.blob.contentType,
    }
  }

  async getSignedUrl(path: string, expiresInSeconds = 3600): Promise<SignedUrl> {
    assertSafeStoragePath(path)
    const validUntil = Date.now() + Math.max(1, Math.min(expiresInSeconds, 3600)) * 1000
    // Never issue a wildcard delegation or expose the signing secret to clients.
    const signedToken = await issueSignedToken({
      ...this.credentials, pathname: path, operations: ['get'], validUntil,
    })
    const { presignedUrl } = await presignUrl(signedToken, {
      operation: 'get', pathname: path, access: 'private', validUntil,
    })
    return { url: presignedUrl, expiresAt: new Date(validUntil) }
  }
}

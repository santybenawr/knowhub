/**
 * §72 — Storage boundary.
 *
 * Everything KnowHub stores is private. Reads happen through short-lived
 * signed URLs issued only after the caller has been authorised (§73).
 */
export type StoredObject = {
  path: string
  size: number
  mimeType: string
}

export type SignedUrl = {
  url: string
  expiresAt: Date
}

export interface StorageProvider {
  readonly name: string
  upload(input: {
    path: string
    body: Buffer | Uint8Array
    mimeType: string
  }): Promise<StoredObject>
  delete(path: string): Promise<void>
  getSignedUrl(path: string, expiresInSeconds?: number): Promise<SignedUrl>
  /** Server-side read, used by transcription. Never exposed to the client. */
  read(path: string): Promise<{ body: Buffer; mimeType: string }>
  exists(path: string): Promise<boolean>
}

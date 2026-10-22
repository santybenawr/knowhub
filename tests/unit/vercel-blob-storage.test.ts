import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlobNotFoundError, head, issueSignedToken, presignUrl, put } from '@vercel/blob'
import { VercelBlobStorageProvider } from '@/server/storage/vercel-blob'

vi.mock('@vercel/blob', () => ({
  BlobNotFoundError: class extends Error {},
  put: vi.fn(), del: vi.fn(), head: vi.fn(), get: vi.fn(),
  issueSignedToken: vi.fn(), presignUrl: vi.fn(),
}))

beforeEach(() => vi.resetAllMocks())

describe('private Vercel Blob storage', () => {
  const storage = new VercelBlobStorageProvider({ token: 'test-server-only-token' })

  it('rejects path traversal before any provider request', async () => {
    for (const action of [
      () => storage.upload({ path: '../secret', body: Buffer.from('x'), mimeType: 'text/plain' }),
      () => storage.read('../secret'), () => storage.delete('../secret'),
      () => storage.exists('../secret'), () => storage.getSignedUrl('../secret'),
    ]) await expect(action()).rejects.toThrow()
    expect(put).not.toHaveBeenCalled()
    expect(head).not.toHaveBeenCalled()
    expect(issueSignedToken).not.toHaveBeenCalled()
  })

  it('does not confuse service errors with a missing document', async () => {
    vi.mocked(head).mockRejectedValueOnce(new BlobNotFoundError())
    await expect(storage.exists('workspace/file.txt')).resolves.toBe(false)
    vi.mocked(head).mockRejectedValueOnce(new Error('service unavailable'))
    await expect(storage.exists('workspace/file.txt')).rejects.toThrow('service unavailable')
  })

  it('limits signed access to one private file, GET and at most one hour', async () => {
    const now = Date.now()
    vi.mocked(issueSignedToken).mockResolvedValue({ delegationToken: 'delegation', clientSigningToken: 'never-expose', validUntil: now + 3600000 })
    vi.mocked(presignUrl).mockResolvedValue({ presignedUrl: 'https://private.example/file?signed=1' })
    const result = await storage.getSignedUrl('workspace/file.txt', 86400)
    const scope = vi.mocked(issueSignedToken).mock.calls[0]![0]!
    expect(scope.pathname).toBe('workspace/file.txt')
    expect(scope.operations).toEqual(['get'])
    expect(scope.validUntil).toBeLessThanOrEqual(Date.now() + 3600000)
    expect(result.url).not.toContain('never-expose')
    expect(presignUrl).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ access: 'private', operation: 'get', pathname: 'workspace/file.txt' }))
  })
})

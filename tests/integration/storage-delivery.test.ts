import { afterAll, beforeAll, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import { getStorageProvider } from '@/server/storage'
import { GET } from '@/app/api/storage/[...path]/route'

const path = `workspaces/${randomUUID()}/audio.wav`
let url: string
beforeAll(async () => {
  const storage = getStorageProvider()
  await storage.upload({ path, body: Buffer.from('0123456789'), mimeType: 'audio/wav' })
  url = `http://localhost:3010${(await storage.getSignedUrl(path)).url}`
})
afterAll(async () => { await getStorageProvider().delete(path) })
const request = (headers: Record<string, string> = {}, target = url) => GET(new NextRequest(target, { headers }), { params: Promise.resolve({ path: path.split('/') }) })

it('delivers the requested bytes and accurate range headers', async () => {
  const response = await request({ range: 'bytes=2-5' })
  expect(response.status).toBe(206)
  expect(response.headers.get('content-range')).toBe('bytes 2-5/10')
  expect(response.headers.get('content-length')).toBe('4')
  expect(await response.text()).toBe('2345')
})
it('returns 416 for an unsatisfiable range', async () => {
  const response = await request({ range: 'bytes=10-' })
  expect(response.status).toBe(416)
  expect(response.headers.get('content-range')).toBe('bytes */10')
})
it('delivers the full file when If-Range cannot be verified', async () => {
  const response = await request({ range: 'bytes=2-5', 'if-range': '"old"' })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('0123456789')
})
it('does not reveal bytes to an unsigned request', async () => {
  const response = await request({ range: 'bytes=2-5' }, url.split('?')[0])
  expect(response.status).toBe(403)
})

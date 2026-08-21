import { NextResponse, type NextRequest } from 'next/server'
import { getServerEnv } from '@/config/env'
import { getStorageProvider, verifyLocalSignature } from '@/server/storage'
import { assertSafeStoragePath } from '@/server/storage/paths'

export const dynamic = 'force-dynamic'

/**
 * §72/§73 — Private object delivery for the local storage provider.
 *
 * The signature and expiry in the query string are the authorisation: they are
 * issued only after `getAudioUrl` has verified workspace membership. Without a
 * valid, unexpired signature this route reveals nothing — the object path alone
 * is not enough. (With Supabase Storage, its own signed URLs are used instead
 * and this route is never called.)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const env = getServerEnv()
  if (env.STORAGE_PROVIDER !== 'local') {
    return NextResponse.json({ error: 'No disponible.' }, { status: 404 })
  }

  const { path: segments } = await params
  const path = segments.join('/')
  const expires = request.nextUrl.searchParams.get('expires')
  const signature = request.nextUrl.searchParams.get('signature')

  if (!expires || !signature) {
    return NextResponse.json({ error: 'Enlace no válido.' }, { status: 403 })
  }

  try {
    assertSafeStoragePath(path)
  } catch {
    return NextResponse.json({ error: 'Ruta no válida.' }, { status: 400 })
  }

  if (!verifyLocalSignature(path, expires, signature)) {
    return NextResponse.json({ error: 'El enlace expiró o no es válido.' }, { status: 403 })
  }

  try {
    const { body, mimeType } = await getStorageProvider().read(path)
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(body.byteLength),
        // Private, and only for as long as the signature is valid anyway.
        'Cache-Control': 'private, max-age=600',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        // Range support lets the player seek without downloading the whole file.
        'Accept-Ranges': 'bytes',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No encontramos el archivo.' }, { status: 404 })
  }
}

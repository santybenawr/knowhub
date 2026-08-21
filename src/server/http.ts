import { NextResponse } from 'next/server'
import { isAppError } from '@/lib/errors'

/**
 * Route-handler error translation.
 *
 * Known application errors surface their message and status; anything else
 * becomes a generic 500 and is logged server-side. Stack traces and provider
 * payloads never reach the client.
 */
export function errorResponse(err: unknown): NextResponse {
  if (isAppError(err)) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
  }
  console.error('[knowhub] unhandled route error', err)
  return NextResponse.json(
    { error: 'Ocurrió un error inesperado.', code: 'internal' },
    { status: 500 },
  )
}

export function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Necesitas iniciar sesión.', code: 'unauthenticated' }, { status: 401 })
}

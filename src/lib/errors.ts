/**
 * Typed application errors. Server code throws these; route handlers and
 * server actions translate them into a status code and a human message.
 * Never leak stack traces or provider payloads to the client.
 */
export type AppErrorCode =
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'rate_limited'
  | 'limit_exceeded'
  | 'unsupported'
  | 'provider_error'
  | 'internal'

const STATUS: Record<AppErrorCode, number> = {
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  validation: 422,
  conflict: 409,
  rate_limited: 429,
  limit_exceeded: 402,
  unsupported: 415,
  provider_error: 502,
  internal: 500,
}

export class AppError extends Error {
  readonly code: AppErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: AppErrorCode, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.status = STATUS[code]
    this.details = details
  }
}

export const unauthenticated = (m = 'Necesitas iniciar sesión.') => new AppError('unauthenticated', m)
export const forbidden = (m = 'No tienes acceso a este recurso.') => new AppError('forbidden', m)
export const notFound = (m = 'No encontramos este recurso.') => new AppError('not_found', m)
export const validation = (m: string, details?: Record<string, unknown>) =>
  new AppError('validation', m, details)
export const rateLimited = (m = 'Demasiadas solicitudes. Intenta de nuevo en un momento.') =>
  new AppError('rate_limited', m)
export const limitExceeded = (m: string) => new AppError('limit_exceeded', m)
export const unsupported = (m: string) => new AppError('unsupported', m)
export const providerError = (m: string, details?: Record<string, unknown>) =>
  new AppError('provider_error', m, details)

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

/** Message safe to show a user, whatever was thrown. */
export function toUserMessage(err: unknown): string {
  if (isAppError(err)) return err.message
  return 'Ocurrió un error inesperado. Intenta de nuevo.'
}

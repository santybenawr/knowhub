import { getServerEnv } from '@/config/env'

/**
 * Whether session cookies should carry the `Secure` attribute.
 *
 * Keyed on the scheme the app is actually served over rather than on
 * `NODE_ENV`. A `Secure` cookie is not sent over plain HTTP at all, so tying
 * this to `NODE_ENV === 'production'` silently breaks sign-in for anyone
 * running a production build behind a plain-HTTP origin — including a local
 * end-to-end suite. Deployments served over HTTPS still get `Secure`, which is
 * the case that matters.
 */
export function shouldUseSecureCookies(): boolean {
  const env = getServerEnv()
  try {
    const secure = new URL(env.NEXT_PUBLIC_APP_URL).protocol === 'https:'
    if (!secure && env.NODE_ENV === 'production') {
      console.warn(
        '[knowhub] NEXT_PUBLIC_APP_URL is not https, so session cookies are issued without the Secure flag. Serve KnowHub over HTTPS in production.',
      )
    }
    return secure
  } catch {
    return env.NODE_ENV === 'production'
  }
}

export const SESSION_COOKIE_BASE = {
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
} as const

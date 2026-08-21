import type { NextConfig } from 'next'

/**
 * Security headers (§133). CSP is intentionally strict but allows the
 * `unsafe-inline`/`unsafe-eval` that the Next.js dev overlay requires; in
 * production only inline styles are permitted (Tailwind injects none, but
 * Next injects a small inline style for font preloads).
 */
const isProd = process.env.NODE_ENV === 'production'

const csp = [
  "default-src 'self'",
  `script-src 'self' ${isProd ? "'unsafe-inline'" : "'unsafe-inline' 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  // Dev needs the HMR websocket; production has no websocket at all.
  `connect-src 'self' blob:${isProd ? '' : ' ws: wss:'}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
  /*
   * `KNOWHUB_STANDALONE=1 pnpm build` emits `.next/standalone`: a self-contained
   * server with only the traced dependencies, runnable with `node server.js` and
   * no install step. Used to package a build for people who want to try KnowHub
   * without a development toolchain. Off by default so the normal build is
   * unchanged.
   */
  ...(process.env.KNOWHUB_STANDALONE === '1' ? { output: 'standalone' as const } : {}),
  serverExternalPackages: ['@electric-sql/pglite', '@electric-sql/pglite-pgvector', 'pg', 'mammoth', 'unpdf'],
  experimental: {
    // Keep server action payloads small; audio goes through a route handler.
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // §134: microphone only for this origin, nothing else.
          { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=(), payment=()' },
          ...(isProd
            ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
            : []),
        ],
      },
    ]
  },
}

export default nextConfig

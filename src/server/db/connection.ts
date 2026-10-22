import type { PoolConfig } from 'pg'

/** URL SSL options must not override certificate verification in node-postgres. */
export function postgresConnectionConfig(connectionString: string, ca?: string): PoolConfig {
  const url = new URL(connectionString)
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  for (const key of ['sslmode', 'ssl', 'sslcert', 'sslkey', 'sslrootcert', 'uselibpqcompat']) {
    url.searchParams.delete(key)
  }
  return {
    connectionString: url.toString(),
    max: 3,
    connectionTimeoutMillis: 15_000,
    idleTimeoutMillis: 20_000,
    ssl: local ? false : { rejectUnauthorized: true, ...(ca ? { ca: ca.replace(/\\n/g, '\n') } : {}) },
  }
}

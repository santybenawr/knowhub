import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { getServerEnv } from '@/config/env'
import { assertServerOnly } from '../assert-server'
import { schema } from './schema'

assertServerOnly('server/db/client')

/**
 * Dual-driver Postgres access.
 *
 *  - `DATABASE_URL` present  → node-postgres pool (Supabase / any Postgres).
 *  - `DATABASE_URL` absent   → embedded PGlite with the pgvector extension.
 *
 * Both are real Postgres, so one schema, one set of migrations and one set of
 * queries cover development, CI and production. PGlite exists so the app runs
 * end to end with zero external services — not as a mock.
 */
export type Database = NodePgDatabase<typeof schema>

type DbHandle = {
  db: Database
  driver: 'postgres' | 'pglite'
  close: () => Promise<void>
  /** Raw SQL escape hatch used by vector queries. */
  raw: (query: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>
  /** Multi-statement script execution (migrations). No parameters. */
  exec: (script: string) => Promise<void>
}

declare global {
  var __knowhubDb: Promise<DbHandle> | undefined
}

async function createPostgres(url: string): Promise<DbHandle> {
  const { Pool } = await import('pg')
  const { drizzle } = await import('drizzle-orm/node-postgres')
  const pool = new Pool({
    connectionString: url,
    max: 10,
    // Supabase and most managed Postgres require TLS; local dev usually not.
    ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false },
  })
  const db = drizzle(pool, { schema })
  return {
    db,
    driver: 'postgres',
    close: () => pool.end(),
    raw: async (query, params = []) => {
      const res = await pool.query(query, params as unknown[])
      return { rows: res.rows as Record<string, unknown>[] }
    },
    // No parameters => simple query protocol, which allows several statements
    // (and the dollar-quoted DO blocks the migrations rely on).
    exec: async (script) => {
      await pool.query(script)
    },
  }
}

async function createPglite(dataDir: string): Promise<DbHandle> {
  const { PGlite } = await import('@electric-sql/pglite')
  const { vector } = await import('@electric-sql/pglite-pgvector')
  const { drizzle } = await import('drizzle-orm/pglite')

  // `memory://` rather than `undefined`: the extension bundle is only mounted
  // when PGlite is given an explicit filesystem URL, and an unqualified
  // in-memory instance comes up without pgvector available.
  const inMemory = dataDir === ':memory:' || dataDir.startsWith('memory://')
  if (!inMemory) {
    const { mkdirSync } = await import('node:fs')
    mkdirSync(dataDir, { recursive: true })
  }
  const client = new PGlite(inMemory ? 'memory://' : dataDir, {
    extensions: { vector },
  })
  await client.waitReady
  const db = drizzle(client, { schema }) as unknown as Database
  return {
    db,
    driver: 'pglite',
    close: () => client.close(),
    raw: async (query, params = []) => {
      const res = await client.query(query, params as unknown[])
      return { rows: (res.rows ?? []) as Record<string, unknown>[] }
    },
    exec: async (script) => {
      await client.exec(script)
    },
  }
}

export async function getDbHandle(): Promise<DbHandle> {
  if (!globalThis.__knowhubDb) {
    globalThis.__knowhubDb = (async () => {
      const env = getServerEnv()
      const handle = env.DATABASE_URL
        ? await createPostgres(env.DATABASE_URL)
        : await createPglite(env.PGLITE_DATA_DIR)
      // Migrations are cheap and idempotent; running them on first access keeps
      // `pnpm dev` and the test suite working without a manual step.
      const { runMigrations } = await import('./migrate')
      await runMigrations(handle)
      return handle
    })()
  }
  return globalThis.__knowhubDb
}

export async function getDb(): Promise<Database> {
  return (await getDbHandle()).db
}

/** Raw SQL with positional params, normalised across both drivers. */
export async function rawQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const handle = await getDbHandle()
  const res = await handle.raw(query, params)
  return res.rows as T[]
}

export async function closeDb(): Promise<void> {
  const pending = globalThis.__knowhubDb
  globalThis.__knowhubDb = undefined
  if (pending) {
    const handle = await pending
    await handle.close()
  }
}

export type { DbHandle }

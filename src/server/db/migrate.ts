import type { DbHandle } from './client'
import { migrations } from './migrations'

const LEDGER = '__knowhub_migrations'

/**
 * Minimal forward-only migrator.
 *
 * Each migration runs as a single script (so dollar-quoted blocks survive) and
 * is recorded in a ledger table. Running it twice is a no-op, which is what
 * makes it safe to call on first database access.
 */
export async function runMigrations(handle: DbHandle): Promise<string[]> {
  await handle.exec(
    `CREATE TABLE IF NOT EXISTS ${LEDGER} (
       id text PRIMARY KEY,
       applied_at timestamptz NOT NULL DEFAULT now()
     );`,
  )

  const appliedRows = await handle.raw(`SELECT id FROM ${LEDGER}`)
  const applied = new Set(appliedRows.rows.map((r) => String(r.id)))
  const ran: string[] = []

  for (const migration of migrations) {
    if (applied.has(migration.id)) continue
    if (migration.postgresOnly && handle.driver !== 'postgres') continue

    await handle.exec(migration.sql)
    await handle.raw(`INSERT INTO ${LEDGER} (id) VALUES ($1) ON CONFLICT DO NOTHING`, [migration.id])
    ran.push(migration.id)
  }

  return ran
}

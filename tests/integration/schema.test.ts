import { afterAll, describe, expect, it } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { closeDb, getDbHandle, rawQuery } from '@/server/db/client'
import { schema } from '@/server/db/schema'

afterAll(async () => {
  await closeDb()
})

/**
 * The migrations are hand-written SQL, so nothing stops them drifting from the
 * Drizzle schema except this test. Every column the application code expects
 * must exist in the migrated database.
 */
describe('schema and migrations agree', () => {
  it('creates every table and column the Drizzle schema declares', async () => {
    const rows = await rawQuery<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'`,
    )

    const actual = new Map<string, Set<string>>()
    for (const row of rows) {
      const columns = actual.get(row.table_name) ?? new Set<string>()
      columns.add(row.column_name)
      actual.set(row.table_name, columns)
    }

    const missing: string[] = []
    for (const table of Object.values(schema)) {
      const config = getTableConfig(table)
      const columns = actual.get(config.name)
      if (!columns) {
        missing.push(`table ${config.name}`)
        continue
      }
      for (const column of config.columns) {
        if (!columns.has(column.name)) missing.push(`${config.name}.${column.name}`)
      }
    }

    expect(missing).toEqual([])
  })

  it('records which migrations were applied', async () => {
    const rows = await rawQuery<{ id: string }>(`SELECT id FROM __knowhub_migrations ORDER BY id`)
    expect(rows.map((r) => r.id)).toContain('0000_init')
  })

  it('has pgvector available with the expected operator', async () => {
    const [row] = await rawQuery<{ distance: number }>(
      `SELECT '[1,0,0]'::vector <=> '[0,1,0]'::vector AS distance`,
    )
    expect(Number(row?.distance)).toBeCloseTo(1)
  })

  it('has a full-text search vector on every chunk table', async () => {
    for (const table of ['document_chunks', 'note_chunks', 'meeting_chunks']) {
      const rows = await rawQuery<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = $1 AND column_name = 'search_vector'`,
        [table],
      )
      expect(rows).toHaveLength(1)
    }
  })

  it('enforces that a citation points at exactly one kind of chunk', async () => {
    const handle = await getDbHandle()
    await expect(
      handle.raw(
        `INSERT INTO message_sources (message_id, workspace_id, citation_index)
         VALUES ('00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000000',1)`,
      ),
    ).rejects.toThrow()
  })

  it('rejects a transcript segment that ends before it starts', async () => {
    const handle = await getDbHandle()
    await expect(
      handle.raw(
        `INSERT INTO meeting_transcript_segments
           (meeting_id, workspace_id, segment_index, start_seconds, end_seconds, text)
         VALUES ('00000000-0000-4000-8000-000000000000','00000000-0000-4000-8000-000000000000',0,50,10,'x')`,
      ),
    ).rejects.toThrow()
  })
})

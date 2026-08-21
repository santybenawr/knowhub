/**
 * Migrations are TypeScript modules rather than loose .sql files so they are
 * bundled with the server build and run identically on Postgres and PGlite.
 * Append a new module here; never edit one that has already been applied.
 */
import * as m_0000_init from './0000_init'
import * as m_0001_vector_indexes from './0001_vector_indexes'
import * as m_0002_rls from './0002_rls'
import * as m_0003_spanish_fts from './0003_spanish_fts'

export type Migration = { id: string; sql: string; postgresOnly: boolean }

export const migrations: Migration[] = [
  m_0000_init,
  m_0001_vector_indexes,
  m_0002_rls,
  m_0003_spanish_fts,
]

import { config } from 'dotenv'
import { rmSync } from 'node:fs'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

/**
 * Drops the local development database and stored files.
 *
 * Refuses to run against a real `DATABASE_URL`: this is a convenience for the
 * embedded PGlite database, not a production tool.
 */
async function main() {
  const { getServerEnv } = await import('../src/config/env')
  const env = getServerEnv()

  if (env.DATABASE_URL) {
    console.error('[knowhub] DATABASE_URL is set. Refusing to reset a real database.')
    console.error('[knowhub] Drop it manually if that is really what you want.')
    process.exit(1)
  }

  for (const dir of [env.PGLITE_DATA_DIR, env.STORAGE_LOCAL_DIR]) {
    rmSync(dir, { recursive: true, force: true })
    console.log(`[knowhub] removed ${dir}`)
  }
  console.log('[knowhub] Local database and storage reset. Run `pnpm db:migrate` to recreate.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

import { config } from 'dotenv'
config({ path: '.env.local', quiet: true })
config({ path: '.env', quiet: true })

async function main() {
  const { getDbHandle } = await import('../src/server/db/client')
  const handle = await getDbHandle()
  console.log(`[knowhub] database ready (driver: ${handle.driver})`)
  const rows = await handle.raw(`SELECT id FROM __knowhub_migrations ORDER BY id`)
  console.log('[knowhub] applied migrations:', rows.rows.map((r) => r.id).join(', ') || '(none)')
  await handle.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

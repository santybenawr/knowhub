import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs'
const result = spawnSync(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'build', 'demo-web', '--webpack'],
  { stdio: 'inherit' },
)
if (result.status !== 0) process.exit(result.status ?? 1)
copyFileSync('demo-web/vercel.json', 'demo-web/out/vercel.json')

// Linking a Vercel project may generate an OIDC .env.local; never publish it.
if (existsSync('demo-web/out/.env.local')) unlinkSync('demo-web/out/.env.local')
writeFileSync('demo-web/out/.vercelignore', '.env*\n.vercel\n.git\n')

if (existsSync('demo-web/.vercel/project.json')) {
  mkdirSync('demo-web/out/.vercel', { recursive: true })
  copyFileSync('demo-web/.vercel/project.json', 'demo-web/out/.vercel/project.json')
}

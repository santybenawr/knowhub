import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { resolve } from 'node:path'

// A local-only presentation profile. Never inherit an external database or
// provider key, even when development .env files exist on the presenter laptop.
const root = resolve('.data/presentation')
await mkdir(root, { recursive: true })
let secret
try { secret = await readFile(resolve(root, 'auth-secret'), 'utf8') }
catch (error) {
  if (error.code !== 'ENOENT') throw error
  secret = randomBytes(48).toString('hex')
  await writeFile(resolve(root, 'auth-secret'), secret, { mode: 0o600, flag: 'wx' })
}
const env = {
  ...process.env,
  NODE_ENV: 'production',
  DATABASE_URL: '',
  OPENAI_API_KEY: '',
  TRANSCRIPTION_API_KEY: '',
  STRIPE_SECRET_KEY: '',
  AI_PROVIDER: 'mock',
  TRANSCRIPTION_PROVIDER: 'mock',
  STORAGE_PROVIDER: 'local',
  PGLITE_DATA_DIR: resolve(root, 'database'),
  STORAGE_LOCAL_DIR: resolve(root, 'storage'),
  AUTH_SECRET: secret.trim(),
  AUTH_PROVIDER: 'local',
  NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3010',
  RATE_LIMIT_MULTIPLIER: '1',
  ENABLE_DEMO_DATA: 'true',
}
let active
let stoppingSignal
function run(file, args) {
  return new Promise((resolveRun, reject) => {
    active = spawn(process.execPath, [file, ...args], { env, stdio: 'inherit' })
    active.on('error', reject)
    active.on('exit', (code, signal) => {
      active = undefined
      if (stoppingSignal) process.exit(stoppingSignal === 'SIGINT' ? 130 : 143)
      if (code === 0) resolveRun()
      else reject(new Error(`Demo process stopped (${signal ?? code}).`))
    })
  })
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  stoppingSignal = signal
  active?.kill(signal)
})
const prepare = process.argv.includes('--prepare')
if (prepare) {
  await run('node_modules/next/dist/bin/next', ['build', '--webpack'])
  await run('node_modules/tsx/dist/cli.mjs', ['scripts/seed.ts'])
  console.log('Demo prepared. Start with: npm run demo')
} else {
  console.log('KnowHub local demo: http://127.0.0.1:3010/login')
  console.log('Demo account: demo@knowhub.test / knowhub-demo-2026 (fictional data).')
  await run('node_modules/next/dist/bin/next', ['start', '--hostname', '127.0.0.1', '--port', '3010'])
}

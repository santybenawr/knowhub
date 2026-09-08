import { cpSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)
const root = path.resolve(import.meta.dirname, '..')
const publicDir = path.join(root, 'marketing/public')
mkdirSync(publicDir, { recursive: true })
// Only marketing assets are allowed into the public, server-free export.
cpSync(path.join(root, 'public/marketing'), path.join(publicDir, 'marketing'), { recursive: true })
cpSync(path.join(root, 'public/icon.svg'), path.join(publicDir, 'icon.svg'))
const build = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build', 'marketing'], { cwd: root, stdio: 'inherit' })
if (build.status !== 0) process.exit(build.status ?? 1)
cpSync(path.join(root, 'marketing/vercel.json'), path.join(root, 'marketing/out/vercel.json'))

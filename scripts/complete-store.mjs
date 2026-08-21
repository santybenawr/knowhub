/**
 * Completes a Next.js standalone pnpm store.
 *
 * `next build` with `output: 'standalone'` traces the files it can statically
 * prove are needed. That is usually right, but it can leave a package with only
 * part of its distribution (a CJS build without the ESM one, an asset that is
 * loaded by path), which fails at runtime rather than at build time.
 *
 * This copies each traced store entry in full from the local `node_modules`,
 * then repeatedly follows the symlinks those full copies introduce, pulling in
 * any store entry they point at, until nothing dangles. The result is closed
 * over what is actually referenced, without copying the whole dependency tree.
 */
import { cpSync, existsSync, lstatSync, readdirSync, readlinkSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const [, , rootArg, pkgArg] = process.argv
if (!rootArg || !pkgArg) {
  console.error('usage: complete-store.mjs <project-root> <package-dir>')
  process.exit(1)
}

const sourceStore = join(rootArg, 'node_modules', '.pnpm')
const targetStore = join(pkgArg, 'node_modules', '.pnpm')

if (!existsSync(targetStore)) {
  console.log('    no pnpm store in the standalone output; nothing to complete')
  process.exit(0)
}

/** Store entries look like `name@version` or `@scope+name@version_peer`. */
const entriesOf = (dir) =>
  readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && e.name !== 'node_modules')
    .map((e) => e.name)

/**
 * Packages whose traced copy must be left alone.
 *
 * `next` traced itself, and its own tracer is authoritative about which of its
 * files the production server needs — completing it drags in the whole
 * compiler toolchain. The rest are build- or test-time only: they appear in the
 * store because something declares a peer dependency on them, never because the
 * running server loads them.
 */
const BUILD_TIME_ONLY = [
  /^next@/,
  /^@next\+swc-/,
  /^@babel\+/,
  /^@types\+/,
  /^playwright/,
  /^@playwright\+/,
  /^vite/,
  /^@vitest\+/,
  /^esbuild/,
  /^@esbuild\+/,
  /^eslint/,
  /^@eslint/,
  /^typescript@/,
  /^caniuse-lite@/,
  /^tsx@/,
  /^drizzle-kit@/,
]

const isBuildTimeOnly = (entry) => BUILD_TIME_ONLY.some((pattern) => pattern.test(entry))

const copied = new Set()

function copyEntry(entry) {
  if (copied.has(entry) || isBuildTimeOnly(entry)) return false
  const from = join(sourceStore, entry)
  if (!existsSync(from)) return false
  const to = join(targetStore, entry)
  // Replace rather than merge: a partial copy can hold a symlink where the full
  // package has a directory, and `cpSync` refuses to overwrite across kinds.
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, {
    recursive: true,
    // Preserve pnpm's relative symlinks; they resolve inside the copied store.
    verbatimSymlinks: true,
    force: true,
  })
  copied.add(entry)
  return true
}

for (const entry of entriesOf(targetStore)) copyEntry(entry)

/** Walks the copied store and reports symlinks whose target does not exist. */
function danglingTargets(dir, out = new Set()) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, item.name)
    if (item.isSymbolicLink()) {
      const target = resolve(dir, readlinkSync(full))
      if (!existsSync(target) && target.startsWith(targetStore)) {
        // .pnpm/<entry>/node_modules/<pkg> -> pull in <entry>
        const relative = target.slice(targetStore.length + 1)
        const entry = relative.split('/')[0]
        if (entry) out.add(entry)
      }
    } else if (item.isDirectory()) {
      try {
        if (lstatSync(full).isDirectory()) danglingTargets(full, out)
      } catch {
        // Unreadable entry; nothing to resolve.
      }
    }
  }
  return out
}

// Each round can introduce new links, so repeat until the set closes.
for (let round = 0; round < 12; round++) {
  const missing = danglingTargets(targetStore)
  const pending = [...missing].filter((entry) => !copied.has(entry))
  if (pending.length === 0) break
  let progress = false
  for (const entry of pending) progress = copyEntry(entry) || progress
  if (!progress) break
}

console.log(`    completed ${copied.size} packages`)

// Links into build-time packages are expected to dangle: they are peer
// dependencies that a prebuilt server never loads. Anything else is worth
// surfacing, because it would fail at runtime.
const unexpected = [...danglingTargets(targetStore)].filter((entry) => !isBuildTimeOnly(entry))
if (unexpected.length > 0) {
  console.log(`    warning: ${unexpected.length} unresolved runtime reference(s): ${unexpected.slice(0, 5).join(', ')}`)
}

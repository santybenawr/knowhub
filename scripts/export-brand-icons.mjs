import { mkdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import path from 'node:path'

// Reuse Next's installed image encoder; no network or image generation is needed.
const require = createRequire(import.meta.url)
const nextRequire = createRequire(require.resolve('next/package.json'))
const sharp = nextRequire('sharp')
const root = path.resolve(import.meta.dirname, '..')
const source = path.join(root, 'public/marketing/memory-sculpture.webp')
const output = path.join(root, 'public/brand')
await mkdir(output, { recursive: true })

await sharp(source).resize(256, 256).webp({ quality: 90 }).toFile(path.join(output, 'knowhub-3d.webp'))
for (const [size, filename] of [
  [48, 'brand/favicon-3d.png'],
  [180, 'brand/apple-touch-icon-3d.png'],
  [192, 'icon-192.png'],
  [512, 'icon-512.png'],
]) {
  await sharp(source).resize(size, size).png().toFile(path.join(root, 'public', filename))
}

// Keep all artwork inside the maskable icon's central safe circle.
const inset = await sharp(source).resize(352, 352).png().toBuffer()
await sharp({ create: { width: 512, height: 512, channels: 3, background: '#09080d' } })
  .composite([{ input: inset, left: 80, top: 80 }])
  .png().toFile(path.join(output, 'icon-maskable-3d.png'))

// Preserve the old URL for bookmarks that still reference it.
const embedded = await sharp(source).resize(192, 192).png().toBuffer()
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" role="img" aria-label="KnowHub"><image width="192" height="192" href="data:image/png;base64,${embedded.toString('base64')}"/></svg>\n`
await writeFile(path.join(root, 'public/icon.svg'), svg)
await writeFile(path.join(root, 'demo-web/app/icon.svg'), svg)

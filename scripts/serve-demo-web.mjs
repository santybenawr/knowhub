import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('demo-web/out')
const mime = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain',
  '.json': 'application/json',
}
createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    const pathname = decodeURIComponent(url.pathname)
    const file = path.resolve(
      root,
      `.${pathname}${pathname.endsWith('/') ? 'index.html' : ''}`,
    )
    if (
      !file.startsWith(`${root}${path.sep}`) ||
      pathname.split('/').some((part) => part.startsWith('.'))
    ) {
      response.writeHead(404).end()
      return
    }
    const info = await stat(file)
    if (!info.isFile()) {
      response.writeHead(404).end()
      return
    }
    response.writeHead(200, {
      'Content-Type': `${mime[path.extname(file)] ?? 'application/octet-stream'}; charset=utf-8`,
      'Cache-Control': 'no-store',
    })
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    const stream = createReadStream(file)
    stream.on('error', () => response.destroy())
    stream.pipe(response)
  } catch {
    response.writeHead(404).end()
  }
}).listen(3012, '127.0.0.1', () =>
  console.log('KnowHub demo: http://127.0.0.1:3012'),
)

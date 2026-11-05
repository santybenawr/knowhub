import { unsupported } from '@/lib/errors'

/** Text editors commonly export UTF-8, BOM-marked UTF-16 or Windows-1252. */
export function decodeDocumentText(buffer: Buffer): string {
  let text: string
  try {
    if ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff)) {
      text = new TextDecoder(buffer[0] === 0xff ? 'utf-16le' : 'utf-16be', { fatal: true }).decode(buffer)
    } else {
      try {
        text = new TextDecoder('utf-8', { fatal: true }).decode(buffer)
      } catch {
        // A UTF-8 BOM is an explicit encoding declaration; never reinterpret
        // a truncated/corrupt UTF-8 file as ANSI and silently change its text.
        if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) throw new Error('Invalid UTF-8')
        text = new TextDecoder('windows-1252', { fatal: true }).decode(buffer)
      }
    }
  } catch {
    throw unsupported('No pudimos leer la codificación del texto. Guárdalo como TXT UTF-8 y vuelve a subirlo.')
  }

  // Validate decoded characters, not raw bytes: UTF-16 legitimately contains
  // zero bytes, while a NUL character or C1 controls indicate binary content.
  if (/[\u0000-\u0008\u000b\u000e-\u001f\u007f-\u009f]/u.test(text)) {
    throw unsupported('Este archivo contiene datos que no son texto legible. Guárdalo como TXT UTF-8 y vuelve a subirlo.')
  }
  return text.replace(/^\uFEFF/u, '')
}

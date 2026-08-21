import { getServerEnv } from '@/config/env'
import { unsupported, validation } from '@/lib/errors'
import { formatBytes } from '@/lib/time'

/**
 * §125/§196 — File validation.
 *
 * The client-declared MIME type is a hint, never the decision. Binary formats
 * are confirmed by their magic bytes; text formats are confirmed by decoding.
 * The stored MIME is the one detected here, not the one the browser sent.
 */

export const DOCUMENT_EXTENSIONS = ['pdf', 'docx', 'txt', 'md'] as const
export const AUDIO_EXTENSIONS = ['webm', 'm4a', 'mp3', 'wav', 'ogg', 'mp4'] as const

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export type ValidatedFile = {
  mimeType: string
  extension: string
  size: number
  filename: string
}

export function extensionOf(filename: string): string {
  const match = filename.match(/\.([A-Za-z0-9]{1,8})$/)
  return match?.[1]?.toLowerCase() ?? ''
}

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false
  return bytes.every((b, i) => buffer[i] === b)
}

/** Returns the detected MIME, or null when the bytes match nothing known. */
export function sniffMimeType(buffer: Buffer, filename: string): string | null {
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf' // %PDF
  // DOCX is a ZIP container; the extension disambiguates it from other zips.
  if (startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) || startsWith(buffer, [0x50, 0x4b, 0x05, 0x06])) {
    return extensionOf(filename) === 'docx' ? DOCX_MIME : 'application/zip'
  }
  if (startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3])) return 'audio/webm' // EBML (webm/mkv)
  if (startsWith(buffer, [0x49, 0x44, 0x33]) || (buffer[0] === 0xff && ((buffer[1] ?? 0) & 0xe0) === 0xe0)) {
    return 'audio/mpeg'
  }
  if (startsWith(buffer, [0x52, 0x49, 0x46, 0x46])) return 'audio/wav' // RIFF
  if (startsWith(buffer, [0x4f, 0x67, 0x67, 0x53])) return 'audio/ogg' // OggS
  if (buffer.length > 11 && buffer.subarray(4, 8).toString('latin1') === 'ftyp') {
    return 'audio/mp4' // ISO base media (m4a / mp4)
  }
  if (looksLikeText(buffer)) {
    return extensionOf(filename) === 'md' ? 'text/markdown' : 'text/plain'
  }
  return null
}

function looksLikeText(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 4096)
  if (sample.length === 0) return true
  let suspicious = 0
  for (const byte of sample) {
    // Control characters other than tab/LF/CR mean this is not plain text.
    if (byte === 0) return false
    if (byte < 9 || (byte > 13 && byte < 32)) suspicious++
  }
  return suspicious / sample.length < 0.05
}

export function validateDocumentFile(input: {
  buffer: Buffer
  filename: string
  declaredMime: string
}): ValidatedFile {
  const maxBytes = getServerEnv().MAX_UPLOAD_MB * 1024 * 1024
  if (input.buffer.byteLength === 0) throw validation('El archivo está vacío.')
  if (input.buffer.byteLength > maxBytes) {
    throw validation(`El archivo supera el máximo de ${formatBytes(maxBytes)}.`)
  }

  const extension = extensionOf(input.filename)
  if (!DOCUMENT_EXTENSIONS.includes(extension as (typeof DOCUMENT_EXTENSIONS)[number])) {
    throw unsupported(`Formato no soportado. Acepta: ${DOCUMENT_EXTENSIONS.join(', ').toUpperCase()}.`)
  }

  const detected = sniffMimeType(input.buffer, input.filename)
  if (!detected) throw unsupported('No pudimos reconocer el contenido de este archivo.')

  const expected: Record<string, string[]> = {
    pdf: ['application/pdf'],
    docx: [DOCX_MIME],
    txt: ['text/plain', 'text/markdown'],
    md: ['text/markdown', 'text/plain'],
  }
  if (!expected[extension]?.includes(detected)) {
    throw unsupported('El contenido del archivo no coincide con su extensión.')
  }

  return {
    mimeType: detected,
    extension,
    size: input.buffer.byteLength,
    filename: input.filename,
  }
}

export function validateAudioFile(input: {
  buffer: Buffer
  filename: string
  declaredMime: string
}): ValidatedFile {
  const maxBytes = getServerEnv().MAX_AUDIO_UPLOAD_MB * 1024 * 1024
  if (input.buffer.byteLength === 0) throw validation('El audio está vacío.')
  if (input.buffer.byteLength > maxBytes) {
    throw validation(`El audio supera el máximo de ${formatBytes(maxBytes)}.`)
  }

  const detected = sniffMimeType(input.buffer, input.filename)
  const audioMimes = ['audio/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/webm', 'video/mp4']
  if (!detected || !audioMimes.includes(detected)) {
    throw unsupported(`Formato de audio no soportado. Acepta: ${AUDIO_EXTENSIONS.join(', ').toUpperCase()}.`)
  }

  // Browsers record WebM/MP4 containers; keep the declared codec parameters when
  // they agree with the sniffed container, since providers use them for routing.
  const declaredBase = input.declaredMime.split(';')[0]?.trim() ?? ''
  const mimeType =
    declaredBase && declaredBase.split('/')[1] === detected.split('/')[1] ? input.declaredMime : detected

  return {
    mimeType,
    extension: extensionFor(detected),
    size: input.buffer.byteLength,
    filename: input.filename,
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'audio/webm':
    case 'video/webm':
      return 'webm'
    case 'audio/mpeg':
      return 'mp3'
    case 'audio/wav':
      return 'wav'
    case 'audio/ogg':
      return 'ogg'
    case 'audio/mp4':
    case 'video/mp4':
      return 'm4a'
    default:
      return 'bin'
  }
}

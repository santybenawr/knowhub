import { unsupported } from '@/lib/errors'
import { DocxParser } from './docx'
import { PdfParser } from './pdf'
import { MarkdownParser, TextParser } from './text'
import type { DocumentParser, ParsedDocument } from './types'

export * from './types'
export { PdfParser } from './pdf'
export { DocxParser } from './docx'
export { TextParser, MarkdownParser } from './text'

// Markdown before plain text: a .md file matches both, and the markdown parser
// strips syntax the plain-text one would index as noise.
const PARSERS: DocumentParser[] = [new PdfParser(), new DocxParser(), new MarkdownParser(), new TextParser()]

export function resolveParser(mimeType: string, filename: string): DocumentParser {
  const parser = PARSERS.find((p) => p.supports(mimeType, filename))
  if (!parser) {
    throw unsupported(`Todavía no podemos procesar archivos de tipo "${mimeType || 'desconocido'}".`)
  }
  return parser
}

export async function parseDocument(input: {
  buffer: Buffer
  mimeType: string
  filename: string
}): Promise<ParsedDocument> {
  const parser = resolveParser(input.mimeType, input.filename)
  return parser.parse({ buffer: input.buffer, filename: input.filename })
}

export function isSupportedDocument(mimeType: string, filename: string): boolean {
  return PARSERS.some((p) => p.supports(mimeType, filename))
}

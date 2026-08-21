import { normalizeWhitespace } from '@/lib/text'
import { unsupported } from '@/lib/errors'
import type { DocumentParser, ParsedDocument } from './types'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

/**
 * DOCX extraction via mammoth. Word has no fixed pagination in the file, so the
 * document is reported as a single page and citations reference the excerpt
 * instead of a page number.
 */
export class DocxParser implements DocumentParser {
  readonly name = 'docx'

  supports(mimeType: string, filename: string): boolean {
    return mimeType === DOCX_MIME || /\.docx$/i.test(filename)
  }

  async parse({ buffer }: { buffer: Buffer }): Promise<ParsedDocument> {
    const mammoth = await import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = normalizeWhitespace(result.value ?? '')
    if (text.length === 0) {
      throw unsupported('No pudimos extraer texto de este documento de Word.')
    }
    return { pages: [{ pageNumber: 1, text }], text, pageCount: null, language: null }
  }
}

import { normalizeWhitespace } from '@/lib/text'
import { unsupported } from '@/lib/errors'
import type { DocumentParser, ParsedDocument } from './types'

/**
 * PDF text extraction via unpdf (a serverless-friendly PDF.js build).
 *
 * Pages are kept separate so citations can point at a page number (§112).
 * Scanned PDFs with no text layer produce empty pages; that is reported as an
 * unsupported document rather than indexed as an empty file — OCR is P2 (§164).
 */
export class PdfParser implements DocumentParser {
  readonly name = 'pdf'

  supports(mimeType: string, filename: string): boolean {
    return mimeType === 'application/pdf' || /\.pdf$/i.test(filename)
  }

  async parse({ buffer }: { buffer: Buffer }): Promise<ParsedDocument> {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { totalPages, text } = await extractText(pdf, { mergePages: false })

    const pages = text.map((pageText, i) => ({
      pageNumber: i + 1,
      text: normalizeWhitespace(pageText ?? ''),
    }))

    const combined = pages
      .map((p) => p.text)
      .filter(Boolean)
      .join('\n\n')

    if (combined.trim().length === 0) {
      throw unsupported(
        'Este PDF no contiene texto seleccionable (probablemente es un escaneo). KnowHub aún no hace OCR.',
      )
    }

    return {
      pages: pages.filter((p) => p.text.length > 0),
      text: combined,
      pageCount: totalPages,
      language: null,
    }
  }
}

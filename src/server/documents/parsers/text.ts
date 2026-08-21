import { normalizeWhitespace } from '@/lib/text'
import type { DocumentParser, ParsedDocument } from './types'

const TEXT_MIMES = new Set(['text/plain', 'application/txt', 'text/csv'])

export class TextParser implements DocumentParser {
  readonly name = 'text'

  supports(mimeType: string, filename: string): boolean {
    return TEXT_MIMES.has(mimeType) || /\.(txt|log|csv)$/i.test(filename)
  }

  async parse({ buffer }: { buffer: Buffer }): Promise<ParsedDocument> {
    const text = normalizeWhitespace(buffer.toString('utf8'))
    return { pages: [{ pageNumber: 1, text }], text, pageCount: 1, language: null }
  }
}

export class MarkdownParser implements DocumentParser {
  readonly name = 'markdown'

  supports(mimeType: string, filename: string): boolean {
    return mimeType === 'text/markdown' || mimeType === 'text/x-markdown' || /\.(md|mdx|markdown)$/i.test(filename)
  }

  async parse({ buffer }: { buffer: Buffer }): Promise<ParsedDocument> {
    const raw = buffer.toString('utf8')
    // Strip the syntax that adds no retrievable meaning, keep the prose and the
    // heading text (headings are often the best answer to "where is X").
    const text = normalizeWhitespace(
      raw
        .replace(/^---\n[\s\S]*?\n---\n/, '')
        .replace(/```[\s\S]*?```/g, (block) => block.replace(/```\w*\n?/g, ''))
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`>]/g, ''),
    )
    return { pages: [{ pageNumber: 1, text }], text, pageCount: 1, language: null }
  }
}

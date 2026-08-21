/** §53 — Document parsing boundary. One implementation per format. */

export type ParsedPage = {
  pageNumber: number
  text: string
}

export type ParsedDocument = {
  /** Pagination when the format has it; otherwise a single synthetic page. */
  pages: ParsedPage[]
  text: string
  pageCount: number | null
  language: string | null
}

export interface DocumentParser {
  readonly name: string
  supports(mimeType: string, filename: string): boolean
  parse(input: { buffer: Buffer; filename: string }): Promise<ParsedDocument>
}

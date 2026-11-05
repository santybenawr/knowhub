export const DOCUMENT_FORMATS = [
  { value: 'pdf', label: 'PDF', mimeType: 'application/pdf' },
  { value: 'docx', label: 'Word · DOCX', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  { value: 'txt', label: 'Texto · TXT', mimeType: 'text/plain' },
  { value: 'md', label: 'Markdown · MD', mimeType: 'text/markdown' },
] as const

export type DocumentFormat = (typeof DOCUMENT_FORMATS)[number]['value']

export function documentFormatLabel(mimeType?: string | null): string | null {
  return DOCUMENT_FORMATS.find(format => format.mimeType === mimeType)?.label ?? null
}

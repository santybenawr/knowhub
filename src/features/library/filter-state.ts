import { DOCUMENT_FORMATS, type DocumentFormat } from '@/lib/document-formats'
import type { ResourceKind } from '@/server/search/types'

type QueryValue = string | string[] | undefined
const KINDS: ResourceKind[] = ['document', 'note', 'meeting']

export function parseLibraryFilters(params: { kind?: QueryValue; project?: QueryValue; format?: QueryValue }) {
  const kind = typeof params.kind === 'string' && KINDS.includes(params.kind as ResourceKind)
    ? params.kind as ResourceKind : null
  const projectId = typeof params.project === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params.project)
    ? params.project : null
  const format = (kind === null || kind === 'document') && typeof params.format === 'string'
    ? DOCUMENT_FORMATS.find(option => option.value === params.format)?.value ?? null : null
  return { kind: format ? 'document' as const : kind, projectId, format: format as DocumentFormat | null }
}

export type ResourceKind = 'document' | 'note' | 'meeting'

export type SearchHit = {
  kind: ResourceKind
  chunkId: string
  resourceId: string
  resourceTitle: string
  content: string
  excerpt: string
  score: number
  keywordScore: number
  semanticScore: number
  projectId: string | null
  projectName: string | null
  resourceDate: string
  /** Documents only. */
  pageNumber: number | null
  /** Meetings only (§184). */
  startSeconds: number | null
  endSeconds: number | null
  speakerKeys: string[]
}

export type SearchFilters = {
  kinds?: ResourceKind[]
  projectId?: string | null
  meetingId?: string | null
  documentId?: string | null
  noteId?: string | null
}

export type SearchOptions = {
  workspaceId: string
  query: string
  filters?: SearchFilters
  limit?: number
}

import { randomUUID } from 'node:crypto'

/**
 * §72 — Storage keys are always derived server-side from verified ids. A
 * user-supplied filename never becomes part of a path, and every segment is
 * validated so `..` or an absolute path cannot escape the workspace prefix.
 */
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/

/**
 * `.` and `..` match SAFE_SEGMENT (dots are legal in a filename) but are
 * traversal, so they are rejected separately rather than by widening the
 * character class.
 */
function isSafeSegment(segment: string): boolean {
  return SAFE_SEGMENT.test(segment) && segment !== '.' && segment !== '..'
}

export function meetingAudioPath(workspaceId: string, meetingId: string, extension: string): string {
  return join(workspaceId, 'meetings', meetingId, 'audio', `${randomUUID()}.${sanitizeExtension(extension)}`)
}

export function documentPath(workspaceId: string, documentId: string, extension: string): string {
  return join(workspaceId, 'documents', documentId, `${randomUUID()}.${sanitizeExtension(extension)}`)
}

export function sanitizeExtension(extension: string): string {
  const cleaned = extension.replace(/^\./, '').toLowerCase().slice(0, 8)
  return /^[a-z0-9]+$/.test(cleaned) ? cleaned : 'bin'
}

function join(...segments: string[]): string {
  for (const segment of segments) {
    // Each argument must be exactly one segment: an id that already contains a
    // separator is not a path component, it is an attempt to build a path.
    if (!segment || !isSafeSegment(segment)) {
      throw new Error(`[knowhub] unsafe storage path segment: ${segment}`)
    }
  }
  return segments.join('/')
}

/** Guards a path read back from the database before it touches a filesystem. */
export function assertSafeStoragePath(path: string): void {
  if (!path || path.startsWith('/') || path.includes('..')) {
    throw new Error('[knowhub] unsafe storage path')
  }
  if (!path.split('/').every(isSafeSegment)) {
    throw new Error('[knowhub] unsafe storage path')
  }
}

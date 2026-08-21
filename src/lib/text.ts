/** Text helpers shared by ingestion, search and the UI. */

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n?/g, '\n')
    .replace(/ /g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

/**
 * Rough token estimate. Deliberately approximate: it exists to keep the
 * context budget honest (§111), not to bill anyone.
 */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}

export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

/** Builds a short excerpt centred on the first query term that matches. */
export function buildExcerpt(content: string, query: string, radius = 140): string {
  const haystack = content.toLowerCase()
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2)
  let index = -1
  for (const term of terms) {
    const found = haystack.indexOf(term)
    if (found !== -1 && (index === -1 || found < index)) index = found
  }
  if (index === -1) return truncate(content, radius * 2)
  const start = Math.max(0, index - radius)
  const end = Math.min(content.length, index + radius)
  return `${start > 0 ? '…' : ''}${content.slice(start, end).trim()}${end < content.length ? '…' : ''}`
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

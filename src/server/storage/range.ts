/** Single byte range. Multiple/unknown range forms are ignored per HTTP. */
export function parseByteRange(header: string | null, size: number): { start: number; end: number } | 'unsatisfiable' | null {
  if (!header || !header.startsWith('bytes=') || header.includes(',')) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) return null
  const left = match[1] ? Number(match[1]) : null
  const right = match[2] ? Number(match[2]) : null
  if ((left !== null && !Number.isSafeInteger(left)) || (right !== null && !Number.isSafeInteger(right))) return 'unsatisfiable'
  if (size === 0 || (left === null && right === 0)) return 'unsatisfiable'
  const start = left ?? Math.max(0, size - (right ?? size))
  const end = left === null ? size - 1 : Math.min(right ?? size - 1, size - 1)
  if (start >= size || start > end) return 'unsatisfiable'
  return { start, end }
}

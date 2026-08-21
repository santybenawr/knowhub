import { describe, expect, it } from 'vitest'
import { assertSafeStoragePath, documentPath, meetingAudioPath, sanitizeExtension } from '@/server/storage/paths'

const WORKSPACE = '11111111-1111-4111-8111-111111111111'
const MEETING = '22222222-2222-4222-8222-222222222222'

/** §72/§125 — Storage keys are derived server-side and can never escape. */
describe('storage paths', () => {
  it('derives the meeting audio key from verified ids, never the filename', () => {
    const path = meetingAudioPath(WORKSPACE, MEETING, 'webm')
    expect(path).toMatch(new RegExp(`^${WORKSPACE}/meetings/${MEETING}/audio/[0-9a-f-]+\\.webm$`))
  })

  it('gives two uploads of the same meeting different keys', () => {
    expect(meetingAudioPath(WORKSPACE, MEETING, 'webm')).not.toBe(
      meetingAudioPath(WORKSPACE, MEETING, 'webm'),
    )
  })

  it('scopes document keys under the workspace', () => {
    expect(documentPath(WORKSPACE, MEETING, 'pdf').startsWith(`${WORKSPACE}/documents/`)).toBe(true)
  })

  it('refuses to build a path from an id containing separators', () => {
    expect(() => meetingAudioPath('../../etc', MEETING, 'webm')).toThrow()
    expect(() => meetingAudioPath(WORKSPACE, 'a/b', 'webm')).toThrow()
  })

  it('normalises hostile extensions', () => {
    expect(sanitizeExtension('.WEBM')).toBe('webm')
    expect(sanitizeExtension('../sh')).toBe('bin')
    expect(sanitizeExtension('')).toBe('bin')
  })
})

describe('assertSafeStoragePath', () => {
  it('accepts a well-formed key', () => {
    expect(() => assertSafeStoragePath(`${WORKSPACE}/meetings/${MEETING}/audio/file.webm`)).not.toThrow()
  })

  it('rejects traversal, absolute paths and empty input', () => {
    for (const bad of ['../secrets', 'a/../../b', '/etc/passwd', '', 'a//b']) {
      expect(() => assertSafeStoragePath(bad)).toThrow()
    }
  })
})

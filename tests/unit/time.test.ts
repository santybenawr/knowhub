import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatDateEs,
  formatDurationClock,
  formatDurationHuman,
  formatTimestamp,
  parseTimeParam,
  relativeDayGroup,
} from '@/lib/time'

/** §81/§83 — Timestamp formatting and the `?t=` deep link contract. */
describe('formatTimestamp', () => {
  it('uses mm:ss under an hour and h:mm:ss beyond it', () => {
    expect(formatTimestamp(0)).toBe('00:00')
    expect(formatTimestamp(41)).toBe('00:41')
    expect(formatTimestamp(1421)).toBe('23:41')
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(5021)).toBe('1:23:41')
  })

  it('degrades safely on invalid input instead of printing NaN', () => {
    expect(formatTimestamp(-5)).toBe('00:00')
    expect(formatTimestamp(Number.NaN)).toBe('00:00')
  })
})

describe('formatDurationClock', () => {
  it('always uses HH:MM:SS so the recording timer never changes width', () => {
    expect(formatDurationClock(0)).toBe('00:00:00')
    expect(formatDurationClock(1961)).toBe('00:32:41')
    expect(formatDurationClock(3661)).toBe('01:01:01')
  })
})

describe('parseTimeParam', () => {
  it('accepts both seconds and clock notation', () => {
    expect(parseTimeParam('1421')).toBe(1421)
    expect(parseTimeParam('23:41')).toBe(1421)
    expect(parseTimeParam('1:23:41')).toBe(5021)
  })

  it('rejects anything it cannot trust', () => {
    expect(parseTimeParam(null)).toBeNull()
    expect(parseTimeParam('')).toBeNull()
    expect(parseTimeParam('abc')).toBeNull()
    expect(parseTimeParam('12:xx')).toBeNull()
  })
})

describe('human formatting', () => {
  it('describes durations the way a person would say them', () => {
    expect(formatDurationHuman(null)).toBe('—')
    expect(formatDurationHuman(0)).toBe('—')
    expect(formatDurationHuman(48)).toBe('48 s')
    expect(formatDurationHuman(2580)).toBe('43 min')
    expect(formatDurationHuman(3600)).toBe('1 h')
    expect(formatDurationHuman(4320)).toBe('1 h 12 min')
  })

  it('formats dates in Spanish without depending on the runtime locale', () => {
    expect(formatDateEs(new Date(2026, 7, 20))).toBe('20 ago 2026')
    expect(formatDateEs('not-a-date')).toBe('—')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(900)).toBe('900 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(20 * 1024 * 1024)).toBe('20 MB')
  })

  it('groups conversations by day', () => {
    const now = new Date()
    expect(relativeDayGroup(now)).toBe('Hoy')
    expect(relativeDayGroup(new Date(now.getTime() - 26 * 3600 * 1000))).toBe('Ayer')
    expect(relativeDayGroup(new Date(now.getTime() - 5 * 86_400_000))).toBe('Anteriores')
  })
})

import { expect, it } from 'vitest'
import { formatMeetingDate, parseMeetingDate, todayMeetingDate } from '@/lib/meeting-date'

it('keeps the selected meeting day when stored at UTC midnight', () => {
  const date = parseMeetingDate('2026-11-05')!
  expect(date.toISOString()).toBe('2026-11-05T00:00:00.000Z')
  expect(formatMeetingDate(date)).toBe('5 nov 2026')
  expect(formatMeetingDate('2026-11-05T00:00:00.000Z')).toBe('5 nov 2026')
})

it('uses the Colombian calendar day after UTC has moved to the next day', () => {
  expect(todayMeetingDate(new Date('2026-11-06T02:00:00.000Z'))).toBe('2026-11-05')
  expect(todayMeetingDate(new Date('2026-11-06T05:00:00.000Z'))).toBe('2026-11-06')
})

it.each(['2026-02-30', '2026-13-01', 'not-a-date', '2026-1-1'])('rejects invalid calendar dates: %s', value => {
  expect(parseMeetingDate(value)).toBeNull()
})

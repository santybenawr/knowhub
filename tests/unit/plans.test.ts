import { describe, expect, it } from 'vitest'
import { checkLimit, getPlanLimits, PLAN_LIMITS } from '@/config/plans'

/** §139/§140 — Limits are centralised; these assertions pin the contract. */
describe('plan limits', () => {
  it('falls back to free for unknown or missing plans', () => {
    expect(getPlanLimits(null).id).toBe('free')
    expect(getPlanLimits('enterprise').id).toBe('free')
    expect(getPlanLimits('pro').id).toBe('pro')
  })

  it('grows monotonically from free to team', () => {
    const keys = [
      'maxDocuments',
      'maxStorageBytes',
      'maxAiQueriesPerMonth',
      'meetingMinutesPerMonth',
      'maxMembers',
    ] as const
    for (const key of keys) {
      expect(PLAN_LIMITS.pro[key]).toBeGreaterThan(PLAN_LIMITS.free[key])
      expect(PLAN_LIMITS.team[key]).toBeGreaterThan(PLAN_LIMITS.pro[key])
    }
  })

  it('allows usage up to the limit and refuses the one that would exceed it', () => {
    const free = PLAN_LIMITS.free
    expect(checkLimit(free, 'maxDocuments', free.maxDocuments - 1).allowed).toBe(true)
    expect(checkLimit(free, 'maxDocuments', free.maxDocuments).allowed).toBe(false)
  })

  it('accounts for the size of the incoming item, not just the count', () => {
    const free = PLAN_LIMITS.free
    const almostFull = free.maxStorageBytes - 1024
    expect(checkLimit(free, 'maxStorageBytes', almostFull, 512).allowed).toBe(true)
    expect(checkLimit(free, 'maxStorageBytes', almostFull, 4096).allowed).toBe(false)
  })

  it('explains which limit was hit, in the plan the user is on', () => {
    const result = checkLimit(PLAN_LIMITS.free, 'meetingMinutesPerMonth', 99_999)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.reason).toContain('Free')
      expect(result.reason).toContain('minutos de reuniones')
    }
  })
})

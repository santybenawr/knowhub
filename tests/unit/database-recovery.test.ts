import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pools: [] as Array<{ end: ReturnType<typeof vi.fn>; query: ReturnType<typeof vi.fn>; on: ReturnType<typeof vi.fn> }>,
  migrate: vi.fn(),
}))

vi.mock('pg', () => ({
  Pool: class {
    end = vi.fn().mockResolvedValue(undefined)
    query = vi.fn().mockResolvedValue({ rows: [{ healthy: 1 }] })
    on = vi.fn()
    constructor() { mocks.pools.push(this) }
  },
}))
vi.mock('drizzle-orm/node-postgres', () => ({ drizzle: vi.fn(() => ({})) }))
vi.mock('@/server/db/migrate', () => ({ runMigrations: mocks.migrate }))

import { closeDb, getDbHandle } from '@/server/db/client'
import { resetServerEnvCache } from '@/config/env'

beforeEach(() => {
  vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test')
  resetServerEnvCache()
  mocks.pools.length = 0
  mocks.migrate.mockReset().mockResolvedValue([])
})

afterEach(async () => {
  await closeDb()
  vi.unstubAllEnvs()
  resetServerEnvCache()
  vi.restoreAllMocks()
})

describe('database availability recovery', () => {
  it('reconnects after a failed startup instead of caching the outage forever', async () => {
    mocks.migrate.mockRejectedValueOnce(new Error('Database temporarily unavailable'))
    await expect(getDbHandle()).rejects.toThrow('temporarily unavailable')
    expect(mocks.pools[0]?.end).toHaveBeenCalledOnce()
    const restored = await getDbHandle()
    expect((await restored.raw('SELECT 1')).rows).toEqual([{ healthy: 1 }])
    expect(mocks.pools).toHaveLength(2)
    expect(await getDbHandle()).toBe(restored)
  })

  it('shares a pending connection between concurrent requests', async () => {
    const [first, second] = await Promise.all([getDbHandle(), getDbHandle()])
    expect(first).toBe(second)
    expect(mocks.pools).toHaveLength(1)
    expect(mocks.migrate).toHaveBeenCalledOnce()
  })

  it('handles disconnected idle clients without logging connection credentials', async () => {
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {})
    await getDbHandle()
    const [event, listener] = mocks.pools[0]!.on.mock.calls[0]!
    expect(event).toBe('error')
    expect(() => listener(Object.assign(new Error('sensitive connection details'), { code: 'ECONNRESET' }))).not.toThrow()
    expect(errorLog).toHaveBeenCalledWith('[knowhub] idle database connection lost', { code: 'ECONNRESET' })
  })
})

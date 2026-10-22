import { describe, expect, it } from 'vitest'
import { postgresConnectionConfig } from '@/server/db/connection'

describe('PostgreSQL TLS', () => {
  it('verifies remote certificates even when the URL requests weaker SSL', () => {
    const config = postgresConnectionConfig('postgres://user:pass@db.example.com/app?sslmode=no-verify&ssl=false')
    expect(config.ssl).toEqual({ rejectUnauthorized: true })
    expect(config.connectionString).not.toContain('ssl')
  })

  it('does not mistake localhost in a password or suffix for a local database', () => {
    expect(postgresConnectionConfig('postgres://user:localhost@db.example.com/app').ssl).toEqual({ rejectUnauthorized: true })
    expect(postgresConnectionConfig('postgres://user:pass@localhost.example.com/app').ssl).toEqual({ rejectUnauthorized: true })
    expect(postgresConnectionConfig('postgres://user:pass@localhost/app').ssl).toBe(false)
  })

  it('supports a provider CA without disabling verification', () => {
    expect(postgresConnectionConfig('postgres://user:pass@db.example.com/app', 'one\\ntwo').ssl).toEqual({ rejectUnauthorized: true, ca: 'one\ntwo' })
  })
})

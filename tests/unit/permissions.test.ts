import { describe, expect, it } from 'vitest'
import { can, canAssignRole, permissionsFor } from '@/server/permissions/policy'

/** §17 — The role matrix, asserted as product rules rather than as a table copy. */
describe('role permissions', () => {
  it('lets only the owner delete the workspace or touch billing', () => {
    expect(can('OWNER', 'workspace:delete')).toBe(true)
    expect(can('OWNER', 'billing:manage')).toBe(true)
    for (const role of ['ADMIN', 'MEMBER', 'VIEWER'] as const) {
      expect(can(role, 'workspace:delete')).toBe(false)
      expect(can(role, 'billing:manage')).toBe(false)
    }
  })

  it('lets members create content and record, but not delete or manage members', () => {
    expect(can('MEMBER', 'content:create')).toBe(true)
    expect(can('MEMBER', 'content:edit')).toBe(true)
    expect(can('MEMBER', 'meeting:record')).toBe(true)
    expect(can('MEMBER', 'ai:use')).toBe(true)
    expect(can('MEMBER', 'content:delete')).toBe(false)
    expect(can('MEMBER', 'members:manage')).toBe(false)
  })

  it('limits viewers to reading and searching', () => {
    expect(can('VIEWER', 'content:read')).toBe(true)
    expect(can('VIEWER', 'search:use')).toBe(true)
    expect(can('VIEWER', 'content:create')).toBe(false)
    expect(can('VIEWER', 'meeting:record')).toBe(false)
    expect(can('VIEWER', 'ai:use')).toBe(false)
  })

  it('denies everything for a missing role', () => {
    expect(can(null, 'content:read')).toBe(false)
    expect(can(undefined, 'workspace:read')).toBe(false)
  })

  it('gives admins every member permission plus management', () => {
    const member = permissionsFor('MEMBER')
    const admin = permissionsFor('ADMIN')
    for (const permission of member) expect(admin).toContain(permission)
    expect(admin).toContain('members:manage')
  })
})

describe('role assignment', () => {
  it('only allows assigning a role strictly below your own', () => {
    expect(canAssignRole('OWNER', 'ADMIN')).toBe(true)
    expect(canAssignRole('ADMIN', 'MEMBER')).toBe(true)
    expect(canAssignRole('ADMIN', 'ADMIN')).toBe(false)
    expect(canAssignRole('ADMIN', 'OWNER')).toBe(false)
    expect(canAssignRole('MEMBER', 'VIEWER')).toBe(false)
    expect(canAssignRole('VIEWER', 'VIEWER')).toBe(false)
  })
})

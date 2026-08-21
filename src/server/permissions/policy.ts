import type { WorkspaceRole } from '@/server/db/schema'

/**
 * §17 — Role capabilities. Pure data + a pure predicate so the whole matrix is
 * unit-testable without a database.
 */
export type Permission =
  | 'workspace:read'
  | 'workspace:manage'
  | 'workspace:delete'
  | 'members:manage'
  | 'billing:manage'
  | 'content:read'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'meeting:record'
  | 'ai:use'
  | 'search:use'

const ROLE_PERMISSIONS: Record<WorkspaceRole, readonly Permission[]> = {
  OWNER: [
    'workspace:read',
    'workspace:manage',
    'workspace:delete',
    'members:manage',
    'billing:manage',
    'content:read',
    'content:create',
    'content:edit',
    'content:delete',
    'meeting:record',
    'ai:use',
    'search:use',
  ],
  ADMIN: [
    'workspace:read',
    'workspace:manage',
    'members:manage',
    'content:read',
    'content:create',
    'content:edit',
    'content:delete',
    'meeting:record',
    'ai:use',
    'search:use',
  ],
  MEMBER: [
    'workspace:read',
    'content:read',
    'content:create',
    'content:edit',
    'meeting:record',
    'ai:use',
    'search:use',
  ],
  VIEWER: ['workspace:read', 'content:read', 'search:use'],
}

export function can(role: WorkspaceRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function permissionsFor(role: WorkspaceRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

const RANK: Record<WorkspaceRole, number> = { VIEWER: 0, MEMBER: 1, ADMIN: 2, OWNER: 3 }

/** A member may only assign roles strictly below their own. */
export function canAssignRole(actor: WorkspaceRole, target: WorkspaceRole): boolean {
  if (!can(actor, 'members:manage')) return false
  return RANK[actor] > RANK[target]
}

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  OWNER: 'Propietario',
  ADMIN: 'Administrador',
  MEMBER: 'Miembro',
  VIEWER: 'Lector',
}

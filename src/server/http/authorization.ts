/**
 * Shared authorization guards for workspace-scoped operations.
 *
 * These are defense-in-depth checks that complement the route-level
 * `requirePermission` middleware. They protect against any future code
 * path that calls service methods directly without going through routes.
 *
 * Purpose: Single source of truth for role assertions used across
 * teams, projects, and any future workspace-scoped module.
 *
 * @module server/http/authorization
 */

import { ROLE_PERMISSIONS, type PermissionKey } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

/**
 * Assert that the actor's role grants a specific permission.
 * Uses ROLE_PERMISSIONS constant — single source of truth.
 *
 * Purpose: Permission-based guard for service layer. Replaces hardcode role checks.
 * Future-proof: when custom per-user permissions are added, this is the only place to update.
 *
 * @param role - The actor's workspace role (or null if not a member)
 * @param permission - Required permission (e.g. PERMISSION.TEAM_MANAGE)
 * @param errorCode - Machine-readable error code to throw on failure
 * @throws {AppError} 403 if role is null or lacks the required permission
 */
export function assertHasPermission(role: string | null, permission: PermissionKey, errorCode = 'INSUFFICIENT_ROLE'): void {
  if (!role) {
    throw new AppError('You are not a member of this workspace', 403, errorCode);
  }
  const rolePerms = ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] ?? [];
  if (!rolePerms.includes(permission)) {
    throw new AppError(`Insufficient permissions: "${permission}" required`, 403, errorCode);
  }
}

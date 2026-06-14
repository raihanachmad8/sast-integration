'use client';

import { ROLE_HIERARCHY, type PermissionKey, type Role } from '@/commons/constants/permissions';
import { useSessionData } from '@/modules/auth/queries';

/**
 * Permission context provided by the {@link usePermissions} hook.
 * Contains the user's role, resolved permissions, and helper functions.
 */
export interface PermissionContext {
  /** Current user's role in the active workspace */
  role: Role | undefined;
  /** All permissions granted to the current role */
  permissions: PermissionKey[];
  /** Check if the current role has a specific permission */
  has: (permission: PermissionKey) => boolean;
  /** Check if the current role has ALL of the given permissions */
  hasAll: (...permissions: PermissionKey[]) => boolean;
  /** Check if the current role has ANY of the given permissions */
  hasAny: (...permissions: PermissionKey[]) => boolean;
  /** Check if the current role is at least the given minimum role (role hierarchy) */
  isAtLeast: (minRole: Role) => boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Hook to access the current user's permission context.
 * Reads the role from the active workspace session and resolves permissions.
 *
 * @returns {@link PermissionContext} containing the user's role, permissions, and helper methods.
 *
 * @example
 * const { has, isAtLeast, role } = usePermissions();
 *
 * if (has(PERMISSION.MEMBER_INVITE)) {
 *   // show invite button
 * }
 *
 * if (isAtLeast(ROLE.MANAGER)) {
 *   // show manager-only content
 * }
 */
export function usePermissions(): PermissionContext {
  const session = useSessionData();
  const role = session.data?.workspace?.role as Role | undefined;

  const permissions = (session.data?.workspace?.permissions ?? []) as PermissionKey[];

  return {
    role,
    permissions,
    has: (permission) => permissions.includes(permission),
    hasAll: (...perms) => perms.every(p => permissions.includes(p)),
    hasAny: (...perms) => perms.some(p => permissions.includes(p)),
    isAtLeast: (minRole) => {
      if (!role) return false;
      return (ROLE_HIERARCHY[role] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
    },
    isLoading: session.isLoading,
  };
}

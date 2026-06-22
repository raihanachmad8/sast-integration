'use client';

import type { ReactNode } from 'react';
import { usePermissions, type PermissionContext } from '@/lib/hooks/usePermissions';
import type { PermissionKey, Role } from '@/commons/constants/permissions';

/** Props for the PermissionGate component. */
interface PermissionGateProps {
  /** Required permission — renders children only if user has this permission */
  permission?: PermissionKey;
  /** Require ALL of these permissions (AND logic) */
  anyOf?: PermissionKey[];
  /** Require ANY of these permissions (OR logic) */
  oneOf?: PermissionKey[];
  /** Minimum role required (role hierarchy: owner > manager > reviewer > member) */
  minRole?: Role;
  /** Content to render when permission check passes */
  children: ReactNode;
  /** Content to render when permission check fails (default: null) */
  fallback?: ReactNode;
}

/**
 * Conditional rendering gate based on workspace permissions or role.
 *
 * Supports four gating strategies (can be combined):
 * - `permission` — single permission check
 * - `anyOf` — all listed permissions required (AND)
 * - `oneOf` — any listed permission suffices (OR)
 * - `minRole` — role hierarchy check
 *
 * When multiple strategies are provided, ALL must pass (AND logic).
 *
 * @param props - {@link PermissionGateProps}
 * @returns JSX element containing children if permission check passes, otherwise fallback.
 *
 * @example
 * // Single permission
 * <PermissionGate permission={PERMISSION.MEMBER_INVITE}>
 *   <InviteButton />
 * </PermissionGate>
 *
 * @example
 * // Role-based
 * <PermissionGate minRole={ROLE.MANAGER}>
 *   <AdminPanel />
 * </PermissionGate>
 *
 * @example
 * // With fallback
 * <PermissionGate permission={PERMISSION.REPORT_EXPORT} fallback={<UpgradeHint />}>
 *   <ExportButton />
 * </PermissionGate>
 *
 * @example
 * // Render prop for advanced usage
 * <PermissionGate permission={PERMISSION.FINDING_TRIAGE}>
 *   {({ has, role }) => (
 *     <TriagePanel canTriage={has(PERMISSION.FINDING_TRIAGE)} role={role} />
 *   )}
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  anyOf,
  oneOf,
  minRole,
  children,
  fallback = null,
}: PermissionGateProps) {
  const ctx = usePermissions();

  if (ctx.isLoading) return fallback;

  // Check single permission
  if (permission && !ctx.has(permission)) return <>{fallback}</>;

  // Check AND logic (all required)
  if (anyOf && anyOf.length > 0 && !ctx.hasAll(...anyOf)) return <>{fallback}</>;

  // Check OR logic (any suffices)
  if (oneOf && oneOf.length > 0 && !ctx.hasAny(...oneOf)) return <>{fallback}</>;

  // Check minimum role
  if (minRole && !ctx.isAtLeast(minRole)) return <>{fallback}</>;

  return <>{children}</>;
}

/**
 * Props for the Can render-prop component. */
interface CanProps {
  /** Required permission check */
  permission?: PermissionKey;
  /** Minimum role check */
  minRole?: Role;
  /** Render prop that receives the permission context */
  children: (ctx: PermissionContext) => ReactNode;
}

/**
 * Render-prop version of PermissionGate for advanced usage.
 *
 * @param props - {@link CanProps}
 * @returns JSX element containing the render-prop result, or null if permission check fails.
 *
 * @example
 * <Can permission={PERMISSION.MEMBER_MANAGE}>
 *   {({ has, role, isAtLeast }) => (
 *     <div>
 *       {has(PERMISSION.MEMBER_INVITE) && <InviteBtn />}
 *       {isAtLeast(ROLE.OWNER) && <DeleteBtn />}
 *     </div>
 *   )}
 * </Can>
 */
export function Can({
  permission,
  minRole,
  children,
}: CanProps) {
  const ctx = usePermissions();

  if (ctx.isLoading) return null;

  if (permission && !ctx.has(permission)) return null;
  if (minRole && !ctx.isAtLeast(minRole)) return null;

  return <>{children(ctx)}</>;
}

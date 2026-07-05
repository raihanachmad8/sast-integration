/**
 * Member schemas — single source of truth for member validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `memberListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms (`lenientEnum`, `lenientInt`) coerce invalid values to defaults
 *    instead of returning 422 — the route falls back to safe defaults.
 *
 * ### Form (client-side)
 * 1. `react-hook-form` with `zodResolver(memberListQuerySchema)` validates in-browser
 * 2. Same schema used on server and client ensures consistency.
 *
 * @module schemas/member
 */
import { z } from 'zod';

import { ROLE } from '@/commons/constants/permissions';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// Re-export for backward compatibility — prefer importing from lenient-helpers directly
export { lenientEnum, lenientInt, SORT_ORDERS };

// ─── Allowed value arrays ─────────────────────────────────────────────────────

export const assignableRoles = [ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER] as const;
export const allRoles = [ROLE.OWNER, ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER] as const;

export const MEMBER_SORT_FIELDS = ['name', 'email', 'role', 'joinedAt'] as const;

// ─── Member list query (GET /workspaces/:workspaceId/members) ──────────────────

export const memberListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  role: lenientEnum(allRoles),
  sort: lenientEnum(MEMBER_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type MemberListQuery = z.infer<typeof memberListQuerySchema>;

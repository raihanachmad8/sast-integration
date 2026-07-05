/**
 * Invitation schemas — single source of truth for invitation validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `invitationListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms (`lenientEnum`, `lenientInt`) coerce invalid values to defaults
 *    instead of returning 422 — the route falls back to safe defaults.
 *
 * ### Body / Mutation (server-side)
 * 1. Route handler calls `validateBody(request, inviteMemberSchema)`
 * 2. Strict validation — invalid input returns 422 with Zod error message.
 *
 * @module schemas/invitation
 */
import { z } from 'zod';

import { ROLE } from '@/commons/constants/permissions';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Allowed value arrays ─────────────────────────────────────────────────────

const assignableRoles = [ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER] as const;
const allRoles = [ROLE.OWNER, ROLE.MANAGER, ROLE.REVIEWER, ROLE.MEMBER] as const;

export const INVITATION_SORT_FIELDS = ['createdAt', 'email', 'role'] as const;

// ─── Invitation list query (GET /workspaces/:workspaceId/invitations) ───────────

export const invitationListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  status: lenientEnum(['pending', 'accepted', 'expired', 'all']),
  role: lenientEnum(allRoles),
  sort: lenientEnum(INVITATION_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

// ─── Body schemas (mutations — strict validation) ──────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum(assignableRoles),
});

export const changeRoleSchema = z.object({
  role: z.enum(assignableRoles),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type InvitationListQuery = z.infer<typeof invitationListQuerySchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

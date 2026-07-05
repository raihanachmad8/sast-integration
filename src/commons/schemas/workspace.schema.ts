/**
 * Workspace schemas — single source of truth for workspace validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `workspaceListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms (`lenientEnum`, `lenientInt`) coerce invalid values to defaults
 *    instead of returning 422 — the route falls back to safe defaults.
 *
 * ### Form (client-side)
 * 1. `react-hook-form` with `zodResolver(workspaceCreateSchema)` validates in-browser
 * 2. Same schema used on server and client ensures consistency.
 *
 * @module schemas/workspace
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Allowed value arrays ─────────────────────────────────────────────────────

export const WORKSPACE_SORT_FIELDS = ['name', 'createdAt', 'updatedAt'] as const;

// ─── Workspace list query (GET /workspaces) ────────────────────────────────────

export const workspaceListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  type: lenientEnum(['personal', 'organization']),
  sort: lenientEnum(WORKSPACE_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

// ─── Form schemas (strict) ─────────────────────────────────────────────────────

export const workspaceCreateSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional().default(''),
  type: z.enum(['personal', 'organization'], { message: 'Type must be personal or organization' }).optional().default('personal'),
});

export const workspaceUpdateSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type WorkspaceListQuery = z.infer<typeof workspaceListQuerySchema>;
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;

// ─── Switch workspace ────────────────────────────────────────────────────────

export const switchWorkspaceSchema = z.object({
  currentWorkspaceId: z.string().min(1),
});

export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;

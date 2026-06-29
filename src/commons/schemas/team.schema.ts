/**
 * Team schemas — single source of truth for validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `teamListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms (`lenientEnum`, `lenientInt`) coerce invalid values to defaults.
 *
 * ### Form (client-side)
 * 1. `react-hook-form` with `zodResolver(teamFormSchema)` validates in-browser
 * 2. On submit, data is sent to `POST /api/v1/workspaces/:workspaceId/teams`
 * 3. Server validates body with `validateBody(request, teamFormSchema)` (strict)
 *
 * ### Auto-slug Generation
 * - `slug` is optional on create — server auto-generates from `name` via `teamService.generateSlug()`
 * - Client also auto-fills slug from name in `TeamForm.handleNameChange()`
 *
 * @module schemas/team
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, TEAM_SORT_FIELDS, SORT_ORDERS } from './member.schema';

// --- Form schemas (strict) ---

export const teamFormSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500).optional().default(''),
  memberIds: z.array(z.string()).optional().default([]),
});

export const teamUpdateSchema = teamFormSchema.partial();

// --- List query schema (lenient) ---

export const teamListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  project: z.string().optional(),
  sort: lenientEnum(TEAM_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

export type TeamListQuery = z.infer<typeof teamListQuerySchema>;
export type TeamFormInput = z.infer<typeof teamFormSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;

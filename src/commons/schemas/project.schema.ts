/**
 * Project schemas — single source of truth for validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `projectListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms coerce invalid filter/sort values to defaults.
 *
 * ### Form (client-side)
 * 1. `react-hook-form` with `zodResolver(projectFormSchema)` validates in-browser
 * 2. On submit, data is sent to `POST /api/v1/workspaces/:workspaceId/projects`
 * 3. Server validates body with `validateBody(request, projectFormSchema)` (strict)
 * 4. `teamIds`, `memberIds`, `repositoryIds` are UUID arrays validated with `.uuid()`
 *
 * ### Update (PUT — full replace)
 * 1. `projectFormSchema` (same as create) sends all fields from the form
 * 2. `PUT /api/v1/workspaces/:workspaceId/projects/:projectId`
 * 3. Server validates with `projectUpdateSchema` — `name` required, others have defaults
 * 4. Service always replaces all relation arrays (members, teams, repositories)
 *
 * ### Auto-slug Generation
 * - `slug` is optional on create — server auto-generates from `name` via `projectService.generateSlug()`
 * - Client also auto-fills slug from name in `ProjectForm`
 *
 * @module schemas/project
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, PROJECT_SORT_FIELDS, SORT_ORDERS } from './member.schema';

// --- Form schemas (existing, unchanged) ---

export const projectFormSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(100),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500).optional().default(''),
  lead: z.string().max(100).optional().default(''),
  teamIds: z.array(z.string().uuid()).optional().default([]),
  memberIds: z.array(z.string().uuid()).optional().default([]),
  repositoryIds: z.array(z.string().uuid()).optional().default([]),
});

/** PUT update schema — identical shape to create (full replace semantics). */
export const projectUpdateSchema = projectFormSchema;

// --- List query schema (lenient validation) ---

export const projectListQuerySchema = z.object({
  search: z.string().optional(),
  repository: z.string().uuid().optional(),
  team: z.string().uuid().optional(),
  member: z.string().uuid().optional(),
  sort: lenientEnum(PROJECT_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
});

export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;

export type ProjectFormInput = z.infer<typeof projectFormSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

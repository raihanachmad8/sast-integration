/**
 * API Token schemas — single source of truth for validation.
 *
 * ## Validation Flow
 *
 * ### List Query (server-side)
 * 1. Route handler reads `request.nextUrl.searchParams`
 * 2. Parsed via `apiTokenListQuerySchema.safeParse(Object.fromEntries(...))`
 * 3. Lenient transforms (`lenientInt`) coerce invalid values to defaults
 *    instead of returning 422 — the route falls back to safe defaults.
 *
 * ### Create Token (server-side)
 * 1. `react-hook-form` with `zodResolver(createApiTokenSchema)` validates in-browser
 * 2. On submit, data is sent to `POST /api/v1/workspaces/:workspaceId/projects/:projectId/api-tokens`
 * 3. Server validates body with `validateBody(request, createApiTokenSchema)` (strict)
 * 4. Returns `{ token, rawToken }` — raw token shown once, never stored in plaintext.
 *
 * ### Revoke Token (server-side)
 * - Uses path param validation via `DELETE /api-tokens/:tokenId`
 * - Server verifies token belongs to the project before revoking.
 *
 * @module schemas/api-token
 */
import { z } from 'zod';

import { lenientInt } from './lenient-helpers';

// ─── Form schemas (strict) ─────────────────────────────────────────────────────

export const createApiTokenSchema = z.object({
  name: z.string().min(1, 'Token name is required').max(100),
  permissions: z.array(z.string()).optional(),
  expiresInDays: z.number().int().positive().nullable().optional(),
});

export const revokeApiTokenSchema = z.object({
  tokenId: z.string().uuid('Invalid token ID'),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateApiTokenInput = z.infer<typeof createApiTokenSchema>;
export type RevokeApiTokenInput = z.infer<typeof revokeApiTokenSchema>;

// ─── List query schema (lenient validation) ───────────────────────────────────

export const apiTokenListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
});

export type ApiTokenListQuery = z.infer<typeof apiTokenListQuerySchema>;

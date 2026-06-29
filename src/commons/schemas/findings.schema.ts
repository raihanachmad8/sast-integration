/**
 * Zod schemas for Findings module.
 *
 * Covers:
 * - List query (search, filters, sort, pagination)
 * - Bulk status update
 * - Bulk assign
 */

import { z } from 'zod';

// ─── Reusable helpers ─────────────────────────────────────────────────────────

const lenientInt = (fallback: number) =>
  z.coerce.number().int().nonnegative().catch(fallback);

const lenientSortOrder = z.enum(['asc', 'desc']).catch('desc');

// ─── Finding status / severity enums ──────────────────────────────────────────

const findingStatusValues = ['open', 'confirmed', 'false_positive', 'fixed', 'deferred', 'in_progress'] as const;
const findingSeverityValues = ['critical', 'high', 'medium', 'low', 'info'] as const;

// ─── List query ───────────────────────────────────────────────────────────────

/**
 * Query parameters for GET /workspaces/:workspaceId/findings
 *
 * Lenient: invalid values coerce to safe defaults.
 */
export const findingListQuerySchema = z.object({
  search: z.string().optional().catch(undefined),
  scanId: z.string().uuid().optional().catch(undefined),
  status: z.enum(findingStatusValues).optional().catch(undefined),
  severity: z.enum(findingSeverityValues).optional().catch(undefined),
  projectId: z.string().uuid().optional().catch(undefined),
  repositoryId: z.string().uuid().optional().catch(undefined),
  onlyNew: z.preprocess(
    (v) => (v === 'true' ? true : v === 'false' ? false : undefined),
    z.boolean().optional(),
  ),
  sort: z.string().optional().catch('createdAt'),
  order: lenientSortOrder,
  page: lenientInt(1),
  perPage: lenientInt(10),
});

export type FindingListQuery = z.infer<typeof findingListQuerySchema>;

// ─── Bulk status update ───────────────────────────────────────────────────────

export const bulkUpdateStatusSchema = z.object({
  findingIds: z.array(z.string().uuid()).min(1, 'No finding IDs provided'),
  status: z.enum(findingStatusValues),
});

export type BulkUpdateStatusInput = z.infer<typeof bulkUpdateStatusSchema>;

// ─── Bulk assign ──────────────────────────────────────────────────────────────

export const bulkAssignSchema = z.object({
  findingIds: z.array(z.string().uuid()).min(1, 'No finding IDs provided'),
  userId: z.string().uuid().nullable(),
});

export type BulkAssignInput = z.infer<typeof bulkAssignSchema>;

// ─── Single finding update ───────────────────────────────────────────────────

export const updateFindingSchema = z.object({
  status: z.string().optional(),
  verdict: z.string().optional(),
  assignedTo: z.string().optional(),
});

// ─── Bulk update (route-level) ───────────────────────────────────────────────

export const bulkUpdateFindingsSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one finding ID is required'),
  payload: z.object({
    status: z.enum(['open', 'dismissed', 'resolved']).optional(),
    assignedTo: z.string().optional(),
  }),
});

// ─── AI verify ───────────────────────────────────────────────────────────────

export const aiVerifySchema = z.object({
  scanId: z.string().optional(),
  modelId: z.string().optional(),
  findingIds: z.array(z.string()).optional(),
});

// ─── Verify single finding ──────────────────────────────────────────────────

export const verifyFindingSchema = z.object({
  modelId: z.string().optional(),
});

export type UpdateFindingInput = z.infer<typeof updateFindingSchema>;
export type BulkUpdateFindingsInput = z.infer<typeof bulkUpdateFindingsSchema>;
export type AiVerifyInput = z.infer<typeof aiVerifySchema>;
export type VerifyFindingInput = z.infer<typeof verifyFindingSchema>;

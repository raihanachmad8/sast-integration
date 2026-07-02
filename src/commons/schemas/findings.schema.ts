/**
 * Zod schemas for Findings module.
 *
 * Covers:
 * - List query (search, filters, sort, pagination)
 * - Single finding update
 * - Unified bulk action
 * - AI verify
 * - Verify single finding
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

// ─── Single finding update ───────────────────────────────────────────────────

export const updateFindingSchema = z.object({
  status: z.string().optional(),
  verdict: z.string().optional(),
  assignedTo: z.string().optional(),
});

// ─── Bulk action (unified) ───────────────────────────────────────────────

export const bulkActionFindingsSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one finding ID is required'),
  action: z.enum(['dismiss', 'resolve', 'reverify', 'assign']),
  assignedTo: z.string().optional(),
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

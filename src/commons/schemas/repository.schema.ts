/**
 * Repository schemas — single source of truth for repository validation.
 *
 * @module schemas/repository
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Update schema (partial) ──────────────────────────────────────────────────

export const updateRepoSchema = z.object({
  projectId: z.string().optional(),
});

// ─── List query schema (lenient) ──────────────────────────────────────────────

export const REPOSITORY_SORT_FIELDS = ['name', 'url', 'defaultBranch', 'createdAt'] as const;

export const repositoryListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  imported: z.enum(['true', 'false']).optional(),
  sort: lenientEnum(REPOSITORY_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

export type UpdateRepoInput = z.infer<typeof updateRepoSchema>;
export type RepositoryListQuery = z.infer<typeof repositoryListQuerySchema>;

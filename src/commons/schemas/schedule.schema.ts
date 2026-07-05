/**
 * Schedule schemas — single source of truth for schedule validation.
 *
 * @module schemas/schedule
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Form schemas (strict) ─────────────────────────────────────────────────────

export const createScheduleSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  branch: z.string().min(1, 'Branch is required').max(100),
  timezone: z.string().min(1, 'Timezone is required').max(50).optional().default('UTC'),
  cronExpression: z.string().min(1, 'Cron expression is required').max(100),
  active: z.boolean().optional().default(true),
});

export const updateScheduleSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID').optional(),
  branch: z.string().min(1, 'Branch is required').max(100).optional(),
  timezone: z.string().min(1, 'Timezone is required').max(50).optional(),
  cronExpression: z.string().min(1, 'Cron expression is required').max(100).optional(),
  active: z.boolean().optional(),
});

export const SCHEDULE_SORT_FIELDS = ['cronExpression', 'branch', 'active', 'createdAt'] as const;

// ─── List query schema (lenient) ───────────────────────────────────────────────

export const scheduleListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  sort: lenientEnum(SCHEDULE_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>;

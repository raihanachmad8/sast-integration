/**
 * Shared Zod schemas for schedule management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createScheduleSchema)
 *   - Frontend: zodResolver(createScheduleSchema)
 */

import { z } from 'zod';

export const createScheduleSchema = z.object({
  repositoryId: z.string().uuid('Invalid repository ID'),
  policyId: z.string().uuid('Invalid policy ID'),
  branch: z.string().min(1, 'Branch is required').max(100, 'Branch must be at most 100 characters'),
  timezone: z.string().min(1).max(50).optional().default('UTC'),
  cronExpression: z.string().min(1, 'Cron expression is required').max(100, 'Cron expression must be at most 100 characters'),
  active: z.boolean().optional().default(true),
});

export const updateScheduleSchema = createScheduleSchema.partial();

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

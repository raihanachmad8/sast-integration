import { z } from 'zod';

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

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;

/**
 * Shared Zod schemas for team management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createTeamSchema)
 *   - Frontend: zodResolver(createTeamSchema)
 */

import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
});

export const updateTeamSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters').optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  memberIds: z.array(z.string().uuid()).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;

/**
 * Shared Zod schemas for workspace management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createWorkspaceSchema)
 *   - Frontend: zodResolver(createWorkspaceSchema)
 */

import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
  type: z.enum(['personal', 'organization']).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters').optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(500, 'Description must be at most 500 characters').optional(),
});

export const switchWorkspaceSchema = z.object({
  currentWorkspaceId: z.string().uuid('Invalid workspace ID'),
});

export const updateRoleSchema = z.object({
  role: z.enum(['manager', 'reviewer', 'member']),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type SwitchWorkspaceInput = z.infer<typeof switchWorkspaceSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;

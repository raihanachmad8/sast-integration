/**
 * Shared Zod schemas for project management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createProjectSchema)
 *   - Frontend: zodResolver(createProjectSchema)
 */

import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  lead: z.string().max(255, 'Lead must be at most 255 characters').optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  teamIds: z.array(z.string().uuid()).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  repositoryIds: z.array(z.string().uuid()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(255, 'Name must be at most 255 characters').optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(255, 'Slug must be at most 255 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(1000, 'Description must be at most 1000 characters').optional(),
  lead: z.string().max(255, 'Lead must be at most 255 characters').optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  teamIds: z.array(z.string().uuid()).optional(),
  memberIds: z.array(z.string().uuid()).optional(),
  repositoryIds: z.array(z.string().uuid()).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

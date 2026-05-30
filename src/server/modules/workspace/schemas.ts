import { z } from 'zod';
import { WORKSPACE } from './constants';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional(),
  type: z.enum([WORKSPACE.TYPE.PERSONAL, WORKSPACE.TYPE.ORGANIZATION]).optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional(),
});

export const switchWorkspaceSchema = z.object({
  currentWorkspaceId: z.string().uuid(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

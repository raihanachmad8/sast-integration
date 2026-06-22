import { z } from 'zod';

export const workspaceCreateSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional().default(''),
  type: z.enum(['personal', 'organization'], { message: 'Type must be personal or organization' }).optional().default('personal'),
});

export const workspaceUpdateSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100).optional(),
  slug: z.string().min(1, 'Slug is required').max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens').optional(),
  description: z.string().max(500).optional(),
});

export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;
export type WorkspaceUpdateInput = z.infer<typeof workspaceUpdateSchema>;

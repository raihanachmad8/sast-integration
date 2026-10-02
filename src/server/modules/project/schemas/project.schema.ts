import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(2).max(255),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(1000).optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  slug: z
    .string()
    .min(2)
    .max(255)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  description: z.string().max(1000).optional(),
  platform: z.string().max(50).optional(),
  language: z.string().max(50).optional(),
  avatar_url: z.string().url().optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

import { z } from 'zod';

export const createSourceControlSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'gitea', 'bitbucket', 'azure-devops'] as [string, ...string[]], {
    message: 'Provider must be one of: github, gitlab, gitea, bitbucket, azure-devops',
  }),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters'),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export const updateSourceControlSchema = z.object({
  provider: z.enum(['github', 'gitlab', 'gitea', 'bitbucket', 'azure-devops']).optional(),
  name: z.string().min(1, 'Name is required').max(255, 'Name must be at most 255 characters').optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSourceControlInput = z.infer<typeof createSourceControlSchema>;
export type UpdateSourceControlInput = z.infer<typeof updateSourceControlSchema>;

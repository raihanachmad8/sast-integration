import { z } from 'zod';

const PROVIDERS = ['github', 'gitlab', 'gitea', 'bitbucket', 'azure-devops'] as [string, ...string[]];

export const createSourceControlSchema = z.object({
  provider: z.enum(PROVIDERS, { message: 'Provider must be one of: github, gitlab, gitea, bitbucket, azure-devops' }),
  name: z.string().min(1, 'Name is required').max(255),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export const updateSourceControlSchema = z.object({
  provider: z.enum(PROVIDERS).optional(),
  name: z.string().min(1).max(255).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSourceControlInput = z.infer<typeof createSourceControlSchema>;
export type UpdateSourceControlInput = z.infer<typeof updateSourceControlSchema>;

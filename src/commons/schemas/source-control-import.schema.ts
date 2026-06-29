import { z } from 'zod';

export const importRepoSchema = z.object({
  sourceRepositoryId: z.string().min(1, 'Source repository ID is required'),
  projectId: z.string().optional(),
});

export type ImportRepoInput = z.infer<typeof importRepoSchema>;

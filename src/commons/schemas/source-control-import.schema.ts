import { z } from 'zod';

export const importRepoSchema = z.object({
  project: z.string().min(1, 'Project is required'),
  autoScan: z.boolean().default(true),
});

export type ImportRepoInput = z.infer<typeof importRepoSchema>;

import { z } from 'zod';

export const createScanSchema = z.object({
  repositoryId: z.string().min(1, 'Repository is required'),
  branch: z.string().min(1, 'Branch is required'),
  scanners: z.array(z.string()).optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

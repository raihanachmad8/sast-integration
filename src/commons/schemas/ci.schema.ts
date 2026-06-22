import { z } from 'zod';

export const ciInitSchema = z.object({
  repoName: z.string().min(1, 'repoName is required'),
  repoUrl: z.string().url().optional(),
  branch: z.string().max(100).optional(),
  commit: z.string().max(40).optional(),
  // PR metadata (SonarQube-like PR analysis)
  prNumber: z.number().int().positive().optional(),
  baseBranch: z.string().max(100).optional(),
  headBranch: z.string().max(100).optional(),
  prAuthor: z.string().max(255).optional(),
});

export const ciCompleteSchema = z.object({
  scanId: z.string().uuid('scanId must be a valid UUID'),
  status: z.enum(['completed', 'failed'], { message: 'Status must be completed or failed' }).optional(),
  message: z.string().optional(),
  totalFindings: z.number().int().nonnegative().optional(),
  totalDuration: z.number().nonnegative().optional(),
  successRate: z.number().min(0).max(100).optional(),
  tools: z.array(z.string()).optional(),
  platform: z.string().optional(),
  trigger: z.string().optional(),
});

export type CiInitInput = z.infer<typeof ciInitSchema>;
export type CiCompleteInput = z.infer<typeof ciCompleteSchema>;

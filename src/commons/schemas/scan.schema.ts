import { z } from 'zod';

const SCANNER_NAMES = ['semgrep', 'cppcheck', 'gitleaks', 'flawfinder', 'clang-tidy', 'gcc-fanalyzer'] as const;

export const createScanSchema = z.object({
  repositoryId: z.string().min(1, 'Repository is required'),
  branch: z.string().min(1, 'Branch is required'),
  scanners: z.array(z.enum(SCANNER_NAMES, { message: 'Invalid scanner name' })).optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

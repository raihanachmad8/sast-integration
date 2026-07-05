/**
 * Scan schemas — single source of truth for scan validation.
 *
 * @module schemas/scan
 */
import { z } from 'zod';

const SCANNER_NAMES = ['semgrep', 'cppcheck', 'gitleaks', 'flawfinder', 'clang-tidy', 'gcc-fanalyzer'] as const;

export const createScanSchema = z.object({
  repositoryId: z.string().min(1, 'Repository is required'),
  branch: z.string().min(1, 'Branch is required'),
  scanners: z.array(z.enum(SCANNER_NAMES, { message: 'Invalid scanner name' })).optional(),
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

// ─── Upload scan (CI upload) ─────────────────────────────────────────────────

export const uploadSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  branch: z.string().max(100).optional().default('main'),
  commit: z.string().max(40).optional().default(''),
  source: z.string().max(50).optional().default('ci_upload'),
  repositoryUrl: z.url().optional().or(z.literal('')).default(''),
  repositoryName: z.string().max(255).optional().default(''),
});

export type UploadScanInput = z.infer<typeof uploadSchema>;

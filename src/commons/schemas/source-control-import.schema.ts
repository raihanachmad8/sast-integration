/**
 * Source Control Import schemas — single source of truth for import validation.
 *
 * @module schemas/source-control-import
 */
import { z } from 'zod';

// ─── Import schema (strict) ────────────────────────────────────────────────────

export const importRepoSchema = z.object({
  sourceRepositoryId: z.string().min(1, 'Source repository ID is required'),
  projectId: z.string().optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type ImportRepoInput = z.infer<typeof importRepoSchema>;

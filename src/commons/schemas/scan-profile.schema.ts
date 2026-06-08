import { z } from 'zod';

const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_FINDINGS = 2000;

export const createScanProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255),
  profile: z.enum(['standard', 'strict', 'custom']).optional().default('standard'),
  scanners: z.array(z.string()).min(1, 'At least one scanner is required'),
  aiVerification: z.boolean().optional().default(true),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  timeoutSeconds: z.number().int().min(0).optional().default(DEFAULT_TIMEOUT_SECONDS),
  maxFindings: z.number().int().min(0).optional().default(DEFAULT_MAX_FINDINGS),
});

export const updateScanProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  profile: z.enum(['standard', 'strict', 'custom']).optional(),
  scanners: z.array(z.string()).min(1).optional(),
  aiVerification: z.boolean().optional(),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  timeoutSeconds: z.number().int().min(0).optional(),
  maxFindings: z.number().int().min(0).optional(),
});

export type CreateScanProfileInput = z.infer<typeof createScanProfileSchema>;
export type UpdateScanProfileInput = z.infer<typeof updateScanProfileSchema>;

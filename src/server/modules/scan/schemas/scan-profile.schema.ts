import { z } from 'zod';
import { SUPPORTED_SCANNERS } from '@/commons/constants/scan';

export const createScanPolicySchema = z.object({
  name: z.string().min(1, 'Policy name is required').max(255),
  profile: z.enum(['standard', 'strict', 'custom']).optional().default('standard'),
  scanners: z
    .array(z.string())
    .min(1, 'At least one scanner is required')
    .refine(
      (scanners) => scanners.every((s) => SUPPORTED_SCANNERS.includes(s as (typeof SUPPORTED_SCANNERS)[number])),
      { message: 'One or more scanners are not supported' }
    ),
  aiVerification: z.enum(['enabled', 'disabled']).optional().default('enabled'),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  timeoutSeconds: z.number().int().positive().max(3600).optional().default(300),
  maxFindings: z.number().int().positive().max(10000).optional().default(2000),
});

export const updateScanPolicySchema = createScanPolicySchema.partial().omit({});

export type CreateScanPolicyInput = z.infer<typeof createScanPolicySchema>;
export type UpdateScanPolicyInput = z.infer<typeof updateScanPolicySchema>;

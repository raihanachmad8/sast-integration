/**
 * Shared Zod schemas for scan profile management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createScanProfileSchema)
 *   - Frontend: zodResolver(createScanProfileSchema)
 */

import { z } from 'zod';
import { SUPPORTED_SCANNERS } from '@/commons/constants/scan';

/** Default constants — frontend sends 0 to mean "use default" */
const DEFAULT_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_FINDINGS = 2000;

/** Transform 0 → default value */
const zeroToDefault = (defaultValue: number) =>
  z.number().int().min(0).transform((v) => (v === 0 ? defaultValue : v));

export const createScanProfileSchema = z.object({
  name: z.string().min(1, 'Profile name is required').max(255, 'Name must be at most 255 characters'),
  profile: z.enum(['standard', 'strict', 'custom']).optional().default('standard'),
  scanners: z
    .array(z.string())
    .min(1, 'At least one scanner is required')
    .refine(
      (scanners) => scanners.every((s) => SUPPORTED_SCANNERS.includes(s as (typeof SUPPORTED_SCANNERS)[number])),
      { message: 'One or more scanners are not supported' }
    ),
  aiVerification: z.boolean().optional().default(true),
  severityThreshold: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  timeoutSeconds: zeroToDefault(DEFAULT_TIMEOUT_SECONDS).optional().default(DEFAULT_TIMEOUT_SECONDS),
  maxFindings: zeroToDefault(DEFAULT_MAX_FINDINGS).optional().default(DEFAULT_MAX_FINDINGS),
});

export const updateScanProfileSchema = createScanProfileSchema.partial();

export type CreateScanProfileInput = z.infer<typeof createScanProfileSchema>;
export type UpdateScanProfileInput = z.infer<typeof updateScanProfileSchema>;

import { z } from 'zod';

/**
 * Zod schema for updating PR review settings.
 * All fields are optional since PUT merges with existing settings.
 */
export const updatePrReviewSettingsSchema = z.object({
  postPrSummaryComment: z.boolean().optional(),
  inlineCodeAnnotations: z.boolean().optional(),
  publishQualityGateStatus: z.boolean().optional(),
  statusContext: z.string().max(255, 'Status context must be 255 characters or fewer').optional(),
  reviewSummaryFormat: z.enum(['compact', 'detailed']).optional(),
});

export type UpdatePrReviewSettingsInput = z.infer<typeof updatePrReviewSettingsSchema>;

// ─── Verification settings ───────────────────────────────────────────────────

export const verificationSettingsSchema = z.object({
  attachKnowledge: z.boolean().default(true),
  requireConfidence: z.boolean().default(true),
  allowFallback: z.boolean().default(true),
  confidenceThreshold: z.string().default('90'),
  timeout: z.string().default('90'),
  cweMismatch: z.string().default('warn'),
});

export type VerificationSettingsInput = z.infer<typeof verificationSettingsSchema>;

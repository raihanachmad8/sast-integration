import { z } from 'zod';

export const updateQualityGateSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  threshold: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  fail_on_critical: z.boolean().optional(),
  fail_on_high_tp: z.boolean().optional(),
  warn_on_pending: z.boolean().optional(),
  require_human_ack: z.boolean().optional(),
  pending_behavior: z.enum(['warn', 'fail', 'ignore']).optional(),
});

export const qualityGateConfigSchema = z.object({
  fail_on_critical: z.boolean(),
  fail_on_high_tp: z.boolean(),
  warn_on_pending: z.boolean(),
  require_human_ack: z.boolean(),
  threshold: z.enum(['critical', 'high', 'medium', 'low']),
  pending_behavior: z.enum(['warn', 'fail', 'ignore']),
});

export const evaluateQualityGateSchema = z.object({
  scanId: z.string().uuid('Invalid scan ID'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type UpdateQualityGateInput = z.infer<typeof updateQualityGateSchema>;
export type QualityGateConfigInput = z.infer<typeof qualityGateConfigSchema>;
export type EvaluateQualityGateInput = z.infer<typeof evaluateQualityGateSchema>;

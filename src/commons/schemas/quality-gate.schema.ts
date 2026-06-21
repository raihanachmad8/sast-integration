import { z } from 'zod';

export const updateQualityGateSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  threshold: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  failOnCritical: z.boolean().optional(),
  failOnHighTp: z.boolean().optional(),
  warnOnPending: z.boolean().optional(),
  requireHumanAck: z.boolean().optional(),
  pendingBehavior: z.enum(['warn', 'fail', 'ignore']).optional(),
});

export const qualityGateConfigSchema = z.object({
  failOnCritical: z.boolean(),
  failOnHighTp: z.boolean(),
  warnOnPending: z.boolean(),
  requireHumanAck: z.boolean(),
  threshold: z.enum(['critical', 'high', 'medium', 'low']),
  pendingBehavior: z.enum(['warn', 'fail', 'ignore']),
});

export const evaluateQualityGateSchema = z.object({
  scanId: z.string().uuid('Invalid scan ID'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type UpdateQualityGateInput = z.infer<typeof updateQualityGateSchema>;
export type QualityGateConfigInput = z.infer<typeof qualityGateConfigSchema>;
export type EvaluateQualityGateInput = z.infer<typeof evaluateQualityGateSchema>;

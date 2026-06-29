import { z } from 'zod';

export const updateQualityGateSchema = z.object({
  workspaceId: z.string().uuid('Invalid workspace ID'),
  threshold: z.enum(['critical', 'high', 'medium', 'low'], { message: 'Threshold is required' }).optional(),
  failOnCritical: z.boolean().optional(),
  failOnHighTp: z.boolean().optional(),
  failOnHigh: z.boolean().optional(),
  failOnMedium: z.boolean().optional(),
  failOnLow: z.boolean().optional(),
  failOnPending: z.boolean().optional(),
  failOnTp: z.boolean().optional(),
  warnOnPending: z.boolean().optional(),
  requireHumanAck: z.boolean().optional(),
  pendingBehavior: z.enum(['warn', 'fail', 'ignore'], { message: 'Pending behavior is required' }).optional(),
});

export const qualityGateConfigSchema = z.object({
  failOnCritical: z.boolean(),
  failOnHighTp: z.boolean(),
  failOnHigh: z.boolean(),
  failOnMedium: z.boolean(),
  failOnLow: z.boolean(),
  failOnPending: z.boolean(),
  failOnTp: z.boolean(),
  warnOnPending: z.boolean(),
  requireHumanAck: z.boolean(),
  threshold: z.enum(['critical', 'high', 'medium', 'low'], { message: 'Threshold is required' }),
  pendingBehavior: z.enum(['warn', 'fail', 'ignore'], { message: 'Pending behavior is required' }),
});

export const evaluateQualityGateSchema = z.object({
  scanId: z.string().uuid('Invalid scan ID'),
  workspaceId: z.string().uuid('Invalid workspace ID'),
});

export type UpdateQualityGateInput = z.infer<typeof updateQualityGateSchema>;
export type QualityGateConfigInput = z.infer<typeof qualityGateConfigSchema>;
export type EvaluateQualityGateInput = z.infer<typeof evaluateQualityGateSchema>;

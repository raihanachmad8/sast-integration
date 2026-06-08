import { z } from 'zod';

export const createCustomRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  pattern: z.string().optional(),
  description: z.string().optional(),
});

export type CreateCustomRuleInput = z.infer<typeof createCustomRuleSchema>;

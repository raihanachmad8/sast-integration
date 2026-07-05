/**
 * Knowledge Custom Rule schemas — single source of truth for custom rule validation.
 *
 * @module schemas/knowledge-custom-rule
 */
import { z } from 'zod';

// ─── Create schema (strict) ────────────────────────────────────────────────────

export const createCustomRuleSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  severity: z.enum(['low', 'medium', 'high', 'critical'], { message: 'Severity is required' }).default('medium'),
  pattern: z.string().optional(),
  description: z.string().optional(),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateCustomRuleInput = z.infer<typeof createCustomRuleSchema>;

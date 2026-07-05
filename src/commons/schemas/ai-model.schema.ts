/**
 * AI Model schemas — single source of truth for AI model validation.
 *
 * @module schemas/ai-model
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Form schemas (strict) ─────────────────────────────────────────────────────

export const createAiModelSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100),
  provider: z.string().min(1, 'Provider is required'),
  baseUrl: z.url().optional().or(z.literal('')).default(''),
  apiKey: z.string().optional().default(''),
  role: z.enum(['primary', 'fallback'], { message: 'Role is required' }).default('fallback'),
  priority: z.number().int().min(1).max(10).default(1),
  promptPreset: z.string().optional().default('strict'),
  customSystemPrompt: z.string().optional().default(''),
});

export const updateAiModelSchema = createAiModelSchema.partial();

export const AI_MODEL_SORT_FIELDS = ['name', 'provider', 'priority', 'createdAt'] as const;

// ─── List query schema (lenient) ───────────────────────────────────────────────

export const aiModelListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  sort: lenientEnum(AI_MODEL_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

// ─── Inferred types ────────────────────────────────────────────────────────────

export type CreateAiModelInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelInput = z.infer<typeof updateAiModelSchema>;
export type AiModelListQuery = z.infer<typeof aiModelListQuerySchema>;

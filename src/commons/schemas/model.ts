/**
 * Shared Zod schemas for AI model management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createAiModelSchema)
 *   - Frontend: zodResolver(createAiModelSchema)
 */

import { z } from 'zod';

const AI_MODEL_PROVIDERS = ['ollama', 'openai', 'anthropic', 'google', 'groq', 'deepseek', 'together', 'openrouter'];
const AI_MODEL_ROLES = ['primary', 'fallback'];
const AI_MODEL_PROMPT_PRESETS = ['strict', 'balanced', 'custom'];

export const createAiModelSchema = z.object({
  name: z
    .string()
    .min(1, 'Model name is required')
    .max(100, 'Name must be at most 100 characters'),
  provider: z.enum(AI_MODEL_PROVIDERS as [string, ...string[]], {
    message: 'Provider must be one of: ollama, openai, anthropic, google, groq, deepseek, together, openrouter',
  }),
  base_url: z
    .string()
    .min(1, 'Base URL is required')
    .max(500, 'Base URL must be at most 500 characters')
    .url('Base URL must be a valid URL'),
  api_key_encrypted: z.string().nullable().optional(),
  role: z.enum(AI_MODEL_ROLES).optional().default('fallback'),
  priority: z.number().int().min(1).max(100).optional().default(1),
  prompt_preset: z.enum(AI_MODEL_PROMPT_PRESETS).optional().default('strict'),
  custom_system_prompt: z.string().nullable().optional(),
});

export const updateAiModelSchema = z.object({
  name: z
    .string()
    .min(1, 'Model name is required')
    .max(100, 'Name must be at most 100 characters')
    .optional(),
  provider: z
    .enum(AI_MODEL_PROVIDERS as [string, ...string[]], {
      message: 'Provider must be one of: ollama, openai, anthropic, google, groq, deepseek, together, openrouter',
    })
    .optional(),
  base_url: z
    .string()
    .min(1, 'Base URL is required')
    .max(500, 'Base URL must be at most 500 characters')
    .url('Base URL must be a valid URL')
    .optional(),
  api_key_encrypted: z.string().nullable().optional(),
  role: z.enum(AI_MODEL_ROLES).optional(),
  priority: z.number().int().min(1).max(100).optional(),
  prompt_preset: z.enum(AI_MODEL_PROMPT_PRESETS).optional(),
  custom_system_prompt: z.string().nullable().optional(),
});

export type CreateAiModelInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelInput = z.infer<typeof updateAiModelSchema>;

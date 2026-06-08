import { z } from 'zod';

export const createAiModelSchema = z.object({
  name: z.string().min(1).max(100),
  provider: z.string().min(1),
  baseUrl: z.string().url().optional(),
  base_url: z.string().url().optional(),
  apiKey: z.string().optional(),
  api_key_encrypted: z.string().optional(),
  role: z.enum(['primary', 'fallback']),
  priority: z.number().int().min(1).max(10),
  promptPreset: z.string().optional(),
  prompt_preset: z.string().optional(),
  custom_system_prompt: z.string().optional(),
});

export const updateAiModelSchema = createAiModelSchema.partial();

export type CreateAiModelInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelInput = z.infer<typeof updateAiModelSchema>;

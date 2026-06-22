import { z } from 'zod';

export const createAiModelSchema = z.object({
  name: z.string().min(1, 'Model name is required').max(100),
  provider: z.string().min(1, 'Provider is required'),
  baseUrl: z.string().url().optional().or(z.literal('')).default(''),
  apiKey: z.string().optional().default(''),
  role: z.enum(['primary', 'fallback'], { message: 'Role is required' }).default('fallback'),
  priority: z.number().int().min(1).max(10).default(1),
  promptPreset: z.string().optional().default('strict'),
  customSystemPrompt: z.string().optional().default(''),
});

export const updateAiModelSchema = createAiModelSchema.partial();

export type CreateAiModelInput = z.infer<typeof createAiModelSchema>;
export type UpdateAiModelInput = z.infer<typeof updateAiModelSchema>;

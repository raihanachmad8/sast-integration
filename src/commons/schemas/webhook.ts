/**
 * Shared Zod schemas for webhook management.
 *
 * Single source of truth — used by:
 *   - Backend: validateBody(createWebhookSchema)
 *   - Frontend: zodResolver(createWebhookSchema)
 */

import { z } from 'zod';

const webhookEventSchema = z.string().min(1, 'Event name is required');

export const createWebhookSchema = z.object({
  name: z
    .string()
    .min(1, 'Webhook name is required')
    .max(255, 'Name must be at most 255 characters'),
  url: z
    .string()
    .url('URL must be a valid URL')
    .max(500, 'URL must be at most 500 characters'),
  events: z
    .array(webhookEventSchema)
    .min(1, 'At least one event is required'),
  secret: z
    .string()
    .min(1, 'Secret is required')
    .max(255, 'Secret must be at most 255 characters'),
  active: z.boolean().optional(),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export type CreateWebhookInput = z.output<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

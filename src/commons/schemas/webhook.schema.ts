import { z } from 'zod';

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required').max(100),
  url: z.string().url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  secret: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;

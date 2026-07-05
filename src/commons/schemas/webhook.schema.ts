/**
 * Webhook schemas — single source of truth for webhook validation.
 *
 * @module schemas/webhook
 */
import { z } from 'zod';

import { lenientEnum, lenientInt, SORT_ORDERS } from './lenient-helpers';

// ─── Form schemas (strict) ─────────────────────────────────────────────────────

export const createWebhookSchema = z.object({
  name: z.string().min(1, 'Webhook name is required').max(100),
  url: z.url('Please enter a valid URL'),
  events: z.array(z.string()).min(1, 'Select at least one event'),
  secret: z.string().optional(),
  active: z.boolean().optional().default(true),
});

export const updateWebhookSchema = createWebhookSchema.partial();

export const WEBHOOK_SORT_FIELDS = ['name', 'url', 'active', 'createdAt'] as const;

// ─── List query schema (lenient) ───────────────────────────────────────────────

export const webhookListQuerySchema = z.object({
  page: lenientInt(1),
  perPage: lenientInt(10, 100),
  search: z.string().optional(),
  active: z.enum(['true', 'false']).optional(),
  sort: lenientEnum(WEBHOOK_SORT_FIELDS),
  order: lenientEnum(SORT_ORDERS),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type WebhookListQuery = z.infer<typeof webhookListQuerySchema>;

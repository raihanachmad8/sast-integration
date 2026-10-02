import { apiFetch, apiPost, apiPut, apiDelete } from '@/lib/api/client';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  enabled: boolean;
  secret?: string;
  lastTriggered?: string;
  status: 'active' | 'error' | 'disabled';
}

/**
 * Fetches all webhooks from the server.
 * @returns A list of webhook objects.
 * @example
 * ```ts
 * const webhooks = await listWebhooks();
 * webhooks.forEach((wh) => console.log(wh.name, wh.status));
 * ```
 */
export async function listWebhooks(): Promise<Webhook[]> {
  return apiFetch<Webhook[]>('/api/v1/webhooks');
}

/**
 * Creates a new webhook.
 * @param data - Partial webhook data to create.
 * @returns The newly created webhook.
 * @example
 * ```ts
 * const webhook = await createWebhook({
 *   name: 'CI Notifier',
 *   url: 'https://example.com/hook',
 *   events: ['scan.completed'],
 * });
 * console.log(webhook.id); // 'wh-xyz789'
 * ```
 */
export async function createWebhook(data: Partial<Webhook>): Promise<Webhook> {
  return apiPost<Webhook>('/api/v1/webhooks', data);
}

/**
 * Updates an existing webhook by ID.
 * @param id - The unique identifier of the webhook to update.
 * @param data - Partial webhook data to apply.
 * @returns The updated webhook.
 * @example
 * ```ts
 * const updated = await updateWebhook('wh-xyz789', {
 *   name: 'CI Notifier v2',
 *   enabled: false,
 * });
 * console.log(updated.name); // 'CI Notifier v2'
 * ```
 */
export async function updateWebhook(id: string, data: Partial<Webhook>): Promise<Webhook> {
  return apiPut<Webhook>(`/api/v1/webhooks/${id}`, data);
}

/**
 * Deletes a webhook by ID.
 * @param id - The unique identifier of the webhook to delete.
 * @returns Nothing on success.
 * @example
 * ```ts
 * await deleteWebhook('wh-xyz789');
 * ```
 */
export async function deleteWebhook(id: string): Promise<void> {
  await apiDelete(`/api/v1/webhooks/${id}`);
}

/**
 * Sends a test event to a webhook to verify connectivity.
 * @param id - The unique identifier of the webhook to test.
 * @returns An object indicating whether the test succeeded.
 * @example
 * ```ts
 * const result = await testWebhook('wh-xyz789');
 * console.log(result.success); // true
 * ```
 */
export async function testWebhook(id: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/v1/webhooks/${id}/test`);
}

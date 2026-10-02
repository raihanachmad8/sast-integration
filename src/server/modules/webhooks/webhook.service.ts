import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { webhooks } from '@drizzle/schema/integrations';
import { createWebhookSchema, updateWebhookSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import type { CreateWebhookInput, UpdateWebhookInput } from '@/commons/schemas';

/**
 * Service responsible for managing Webhooks.
 *
 * Webhooks allow external services to receive event notifications
 * from the platform via HTTP callbacks.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const webhookService = {
  /**
   * Creates a new webhook for a workspace.
   * @param workspaceId - The ID of the workspace to create the webhook in.
   * @param input - Raw input to be validated against createWebhookSchema.
   * @param createdBy - The ID of the user creating the webhook.
   * @returns The newly created webhook record.
   * @throws {AppError} if validation fails.
   * @example
   * ```ts
   * const webhook = await webhookService.createWebhook(
   *   'ws-abc123',
   *   { name: 'CI Notifier', url: 'https://example.com/hook', events: ['scan.completed'] },
   *   'user-001'
   * );
   // eslint-disable-next-line no-console
   * console.log(webhook.id); // 'wh-xyz789'
   * ```
   */
  async createWebhook(workspaceId: string, input: unknown, createdBy: string) {
     
    console.info(`[Webhook] CREATE - workspaceId=${workspaceId}, createdBy=${createdBy}`);

 

    const data = createWebhookSchema.parse(input);
     
    console.debug(`[Webhook] CREATE - validated input: name=${data.name}, url=${data.url}, events=${data.events.join(',')}`);

 

    const [webhook] = await db
      .insert(webhooks)
      .values({
        workspace_id: workspaceId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret,
        active: data.active ?? true,
        created_by: createdBy,
        updated_by: createdBy,
      })
      .returning();

     
    console.info(`[Webhook] CREATE - success, webhookId=${webhook.id}`);
     
    return webhook;
  },

  /**
   * Retrieves a single webhook by ID, excluding soft-deleted records.
   * @param id - The unique identifier of the webhook.
   * @returns The matching webhook record.
   * @throws {AppError} if not found.
   * @example
   * ```ts
   * const webhook = await webhookService.getWebhookById('wh-xyz789');
   // eslint-disable-next-line no-console
   * console.log(webhook.name); // 'CI Notifier'
   * ```
   */
  async getWebhookById(id: string) {
     
    console.info(`[Webhook] GET_BY_ID - id=${id}`);

 

    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.deleted_at)))
      .limit(1);

    if (!webhook) {
       
      console.error(`[Webhook] GET_BY_ID - not found, id=${id}`);
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }

     
    console.debug(`[Webhook] GET_BY_ID - found, name=${webhook.name}`);
     
    return webhook;
  },

  /**
   * Lists all non-deleted webhooks belonging to a workspace.
   * @param workspaceId - The workspace to list webhooks for.
   * @returns Array of webhook records for the workspace.
   * @example
   * ```ts
   * const webhooks = await webhookService.listWebhooksByWorkspace('ws-abc123');
   // eslint-disable-next-line no-console
   * console.log(webhooks.length); // 5
   * ```
   */
  async listWebhooksByWorkspace(workspaceId: string) {
     
    console.info(`[Webhook] LIST_BY_WORKSPACE - workspaceId=${workspaceId}`);

 

    const results = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.workspace_id, workspaceId),
          isNull(webhooks.deleted_at)
        )
      );

     
    console.debug(`[Webhook] LIST_BY_WORKSPACE - found ${results.length} webhooks`);
     
    return results;
  },

  /**
   * Updates an existing webhook.
   * @param id - The unique identifier of the webhook to update.
   * @param input - Raw input to be validated against updateWebhookSchema.
   * @param updatedBy - The ID of the user performing the update.
   * @returns The updated webhook record.
   * @throws {AppError} if not found or validation fails.
   * @example
   * ```ts
   * const updated = await webhookService.updateWebhook(
   *   'wh-xyz789',
   *   { name: 'CI Notifier v2', active: false },
   *   'user-001'
   * );
   // eslint-disable-next-line no-console
   * console.log(updated.name); // 'CI Notifier v2'
   * ```
   */
  async updateWebhook(id: string, input: unknown, updatedBy: string) {
     
    console.info(`[Webhook] UPDATE - id=${id}, updatedBy=${updatedBy}`);

 

    const data = updateWebhookSchema.parse(input);
     
    console.debug(`[Webhook] UPDATE - validated input: name=${data.name}, url=${data.url}, active=${data.active}`);

 

    await this.getWebhookById(id);

    const [updated] = await db
      .update(webhooks)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.events !== undefined && { events: data.events }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(data.active !== undefined && { active: data.active }),
        updated_by: updatedBy,
        updated_at: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();

     
    console.info(`[Webhook] UPDATE - success, id=${id}`);
     
    return updated;
  },

  /**
   * Soft-deletes a webhook by setting deleted_at and deleted_by.
   * @param id - The unique identifier of the webhook to delete.
   * @param deletedBy - The ID of the user performing the deletion.
   * @returns The webhook record that was deleted.
   * @throws {AppError} if not found.
   * @example
   * ```ts
   * const deleted = await webhookService.deleteWebhook('wh-xyz789', 'user-001');
   // eslint-disable-next-line no-console
   * console.log(deleted.deleted_at); // 2025-06-03T...
   * ```
   */
  async deleteWebhook(id: string, deletedBy: string) {
     
    console.info(`[Webhook] DELETE - id=${id}, deletedBy=${deletedBy}`);

 

    const existing = await this.getWebhookById(id);

    await db
      .update(webhooks)
      .set({
        deleted_at: new Date(),
        deleted_by: deletedBy,
        updated_by: deletedBy,
        updated_at: new Date(),
      })
      .where(eq(webhooks.id, id));

     
    console.info(`[Webhook] DELETE - success, id=${id}`);
     
    return existing;
  },
};

import { webhookRepository } from './webhook.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { createWebhookSchema, updateWebhookSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

/**
 * Service responsible for managing Webhooks.
 *
 * Webhooks allow external services to receive event notifications
 * from the platform via HTTP callbacks.
 */
export const webhookService = {
  /**
   * Creates a new webhook for a workspace.
   */
  async createWebhook(workspaceId: string, input: unknown, createdBy: string) {
    logger.webhook.info('createWebhook', { workspaceId });
    const role = await workspaceRepository.getMemberRole(workspaceId, createdBy);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = createWebhookSchema.parse(input);

    const result = await webhookRepository.create({
      workspace_id: workspaceId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret: data.secret ?? '',
      active: data.active ?? true,
      created_by: createdBy,
    });
    logger.webhook.info('createWebhook completed', { webhookId: result.id });
    return result;
  },

  /**
   * Retrieves a single webhook by ID, excluding soft-deleted records.
   */
  async getWebhookById(id: string) {
    logger.webhook.info('getWebhookById', { id });
    const webhook = await webhookRepository.findById(id);
    if (!webhook) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }
    logger.webhook.info('getWebhookById completed', { id });
    return webhook;
  },

  /**
   * Lists all non-deleted webhooks belonging to a workspace.
   */
  async listWebhooksByWorkspace(workspaceId: string) {
    logger.webhook.info('listWebhooksByWorkspace', { workspaceId });
    const result = await webhookRepository.listByWorkspace(workspaceId);
    logger.webhook.info('listWebhooksByWorkspace completed', { count: result.length });
    return result;
  },

  /**
   * Updates an existing webhook.
   */
  async updateWebhook(id: string, input: unknown, updatedBy: string, workspaceId: string) {
    logger.webhook.info('updateWebhook', { id });
    const role = await workspaceRepository.getMemberRole(workspaceId, updatedBy);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const data = updateWebhookSchema.parse(input);

    await this.getWebhookById(id);

    const updated = await webhookRepository.update(id, data, updatedBy);
    if (!updated) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }
    logger.webhook.info('updateWebhook completed', { id });
    return updated;
  },

  /**
   * Soft-deletes a webhook by setting deleted_at and deleted_by.
   */
  async deleteWebhook(id: string, deletedBy: string, workspaceId: string) {
    logger.webhook.info('deleteWebhook', { id });
    const role = await workspaceRepository.getMemberRole(workspaceId, deletedBy);
    if (!role) {
      throw new AppError('You are not a member of this workspace', 403, 'FORBIDDEN');
    }
    const existing = await this.getWebhookById(id);

    await webhookRepository.softDelete(id, deletedBy);

    logger.webhook.info('deleteWebhook completed', { id });
    return existing;
  },
};

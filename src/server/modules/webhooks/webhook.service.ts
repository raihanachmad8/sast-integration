import { webhookRepository } from './webhook.repository';
import { assertWorkspaceMember } from '@/server/modules/workspace/assert-workspace-member';
import { createWebhookSchema, updateWebhookSchema } from '@/commons/schemas';
import { AppError, validateSchema } from '@/server/http/errors';
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
    await assertWorkspaceMember(workspaceId, createdBy);
    const data = validateSchema(createWebhookSchema, input);

    const result = await webhookRepository.create({
      workspaceId: workspaceId,
      name: data.name,
      url: data.url,
      events: data.events,
      secret: data.secret ?? '',
      active: data.active ?? true,
      createdBy: createdBy,
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
    await assertWorkspaceMember(workspaceId, updatedBy);
    const data = validateSchema(updateWebhookSchema, input);

    await this.getWebhookById(id);

    const updated = await webhookRepository.update(id, data, updatedBy);
    if (!updated) {
      throw new AppError('Webhook not found', 404, 'NOT_FOUND');
    }
    logger.webhook.info('updateWebhook completed', { id });
    return updated;
  },

  /**
   * Soft-deletes a webhook by setting deletedAt and deletedBy.
   */
  async deleteWebhook(id: string, deletedBy: string, workspaceId: string) {
    logger.webhook.info('deleteWebhook', { id });
    await assertWorkspaceMember(workspaceId, deletedBy);
    const existing = await this.getWebhookById(id);

    await webhookRepository.softDelete(id, deletedBy);

    logger.webhook.info('deleteWebhook completed', { id });
    return existing;
  },

  /**
   * Send a test payload to a webhook URL.
   */
  async testWebhook(id: string, workspaceId: string, userId: string) {
    logger.webhook.info('testWebhook', { id });
    await assertWorkspaceMember(workspaceId, userId);
    const webhook = await this.getWebhookById(id);

    const testPayload = { event: 'webhook.test', timestamp: new Date().toISOString(), data: { webhookId: webhook.id, name: webhook.name } };
    const startTime = Date.now();

    try {
      // SSRF protection: block internal/private IPs
      const url = new URL(webhook.url);
      const hostname = url.hostname;
      if (isPrivateOrInternal(hostname)) {
        throw new AppError('Webhook URL points to internal/private network', 400, 'VALIDATION_ERROR');
      }

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10_000),
      });

      const durationMs = Date.now() - startTime;
      const responseBody = await response.text().catch(() => '');

      await webhookRepository.logDelivery({
        webhookId: id,
        event: 'webhook.test',
        status: response.ok ? 'success' : 'failed',
        responseStatus: response.status,
        requestBody: testPayload,
        responseBody: responseBody.slice(0, 1000),
        durationMs,
      });

      logger.webhook.info('testWebhook completed', { id, status: response.status });
      return { success: response.ok, status: response.status };
    } catch (e) {
      const durationMs = Date.now() - startTime;
      await webhookRepository.logDelivery({
        webhookId: id,
        event: 'webhook.test',
        status: 'error',
        requestBody: testPayload,
        responseBody: e instanceof Error ? e.message : String(e),
        durationMs,
      });

      logger.webhook.error('testWebhook failed', { id, error: e instanceof Error ? e.message : e });
      return { success: false, status: 0 };
    }
  },
};

import { isPrivateOrInternal } from '@/server/lib/ssrf';

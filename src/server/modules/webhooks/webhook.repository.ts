import { eq, and, isNull, desc, count } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { webhooks, webhookDeliveries } from '@drizzle/schema/integrations';

export interface CreateWebhookInput {
  workspaceId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active?: boolean;
  createdBy: string;
}

export interface UpdateWebhookInput {
  name?: string;
  url?: string;
  events?: string[];
  secret?: string;
  active?: boolean;
}

export interface WebhookListParams {
  page?: number;
  perPage?: number;
  search?: string;
  sort?: string;
  order?: string;
  active?: boolean;
}

export const webhookRepository = {
  /**
   * Create a new webhook record.
   */
  async create(data: CreateWebhookInput, tx?: Tx) {
    logger.webhook.info('create', { workspaceId: data.workspaceId, name: data.name });
    const executor = tx ?? db;

    const [webhook] = await executor
      .insert(webhooks)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret,
        active: data.active ?? true,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();

    logger.webhook.info('create completed', { webhookId: webhook.id });
    return webhook;
  },

  /**
   * Find a non-deleted webhook by ID.
   */
  async findById(id: string, tx?: Tx) {
    logger.webhook.info('findById', { id });
    const executor = tx ?? db;
    const [webhook] = await executor
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.deletedAt)))
      .limit(1);

    if (!webhook) {
      logger.webhook.warn('findById: webhook not found', { id });
    }
    return webhook ?? null;
  },

  /**
   * List non-deleted webhooks in a workspace with search, sort, and pagination.
   */
  async listByWorkspace(workspaceId: string, params?: WebhookListParams, tx?: Tx) {
    logger.webhook.info('listByWorkspace', { workspaceId });
    const executor = tx ?? db;

    const conditions = [
      eq(webhooks.workspaceId, workspaceId),
      isNull(webhooks.deletedAt),
      ...buildSearch(params?.search, webhooks.name),
    ];

    if (params?.active !== undefined) {
      conditions.push(eq(webhooks.active, params.active));
    }

    // Count total
    const [{ total }] = await executor
      .select({ total: count() })
      .from(webhooks)
      .where(and(...conditions));

    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: webhooks.name, url: webhooks.url, active: webhooks.active, createdAt: webhooks.createdAt },
      webhooks.createdAt,
    );

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const rows = await executor
      .select()
      .from(webhooks)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.webhook.info('listByWorkspace completed', { workspaceId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * Update a webhook record.
   */
  async update(id: string, data: UpdateWebhookInput, updatedBy: string, tx?: Tx) {
    logger.webhook.info('update', { id });
    const executor = tx ?? db;

    const [updated] = await executor
      .update(webhooks)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.url !== undefined && { url: data.url }),
        ...(data.events !== undefined && { events: data.events }),
        ...(data.secret !== undefined && { secret: data.secret }),
        ...(data.active !== undefined && { active: data.active }),
        updatedBy: updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id))
      .returning();

    logger.webhook.info('update completed', { id });
    return updated ?? null;
  },

  /**
   * Soft-delete a webhook by setting deletedAt timestamp.
   */
  async softDelete(id: string, deletedBy: string, tx?: Tx) {
    logger.webhook.info('softDelete', { id, deletedBy });
    const executor = tx ?? db;

    await executor
      .update(webhooks)
      .set({
        deletedAt: new Date(),
        deletedBy: deletedBy,
        updatedBy: deletedBy,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, id));

    logger.webhook.info('softDelete completed', { id });
  },

  /**
   * Log a webhook delivery attempt.
   */
  async logDelivery(data: { webhookId: string; event: string; status: string; responseStatus?: number; requestBody?: unknown; responseBody?: string; durationMs?: number }, tx?: Tx) {
    logger.webhook.info('logDelivery', { webhookId: data.webhookId, event: data.event });
    const executor = tx ?? db;
    const [delivery] = await executor
      .insert(webhookDeliveries)
      .values({
        webhookId: data.webhookId,
        event: data.event,
        status: data.status,
        responseStatus: data.responseStatus,
        requestBody: data.requestBody ? JSON.stringify(data.requestBody) : null,
        responseBody: data.responseBody,
        durationMs: data.durationMs,
      })
      .returning();
    logger.webhook.info('logDelivery completed', { deliveryId: delivery.id });
    return delivery;
  },

  /**
   * List delivery records for a webhook, ordered by most recent first.
   */
  async listDeliveries(webhookId: string, limit = 50, tx?: Tx) {
    logger.webhook.info('listDeliveries', { webhookId });
    const executor = tx ?? db;
    const rows = await executor
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
    logger.webhook.info('listDeliveries completed', { webhookId, count: rows.length });
    return rows;
  },
};

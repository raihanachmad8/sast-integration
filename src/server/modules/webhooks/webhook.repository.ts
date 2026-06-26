import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { webhooks, webhookDeliveries } from '@drizzle/schema/integrations';
import { logger } from '@/server/lib/logger';
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

export const webhookRepository = {
  /**
   * Create a new webhook record.
   * @param data - Webhook input data (workspaceId, name, url, events, secret, createdBy)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created webhook record
   */
  async create(data: CreateWebhookInput, tx?: Tx) {
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

    return webhook;
  },

  /**
   * Find a non-deleted webhook by ID.
   * @param id - Webhook UUID
   * @returns Webhook record or null if not found
   */
  async findById(id: string) {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.deletedAt)))
      .limit(1);

    return webhook ?? null;
  },

  /**
   * List all non-deleted webhooks in a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Array of webhook records
   */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.workspaceId, workspaceId),
          isNull(webhooks.deletedAt),
        ),
      );
  },

  /**
   * Update a webhook record.
   * @param id - Webhook UUID
   * @param data - Fields to update
   * @param updatedBy - User UUID of the updater
   * @param tx - Optional transaction context
   * @returns Updated webhook record or null if not found
   */
  async update(id: string, data: UpdateWebhookInput, updatedBy: string, tx?: Tx) {
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

    return updated ?? null;
  },

  /**
   * Soft-delete a webhook by setting deletedAt timestamp.
   * @param id - Webhook UUID
   * @param deletedBy - User UUID of the deleter
   * @param tx - Optional transaction context
   */
  async softDelete(id: string, deletedBy: string, tx?: Tx) {
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
  },

  /**
   * Log a webhook delivery attempt.
   * @param data - Delivery data (webhookId, event, status, optional response details and duration)
   * @returns Created delivery record
   */
  async logDelivery(data: { webhookId: string; event: string; status: string; responseStatus?: number; requestBody?: unknown; responseBody?: string; durationMs?: number }) {
    const [delivery] = await db
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
    return delivery;
  },

  /**
   * List delivery records for a webhook, ordered by most recent first.
   * @param webhookId - Webhook UUID
   * @param limit - Maximum number of records to return (default: 50)
   * @returns Array of delivery records
   */
  async listDeliveries(webhookId: string, limit = 50) {
    return db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  },
};

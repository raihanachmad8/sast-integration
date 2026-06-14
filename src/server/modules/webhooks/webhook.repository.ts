import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { webhooks, webhookDeliveries } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

  async findById(id: string) {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.deletedAt)))
      .limit(1);

    return webhook ?? null;
  },

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

  async listDeliveries(webhookId: string, limit = 50) {
    return db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  },
};

import { eq, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { webhooks } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateWebhookInput {
  workspace_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active?: boolean;
  created_by: string;
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
        workspace_id: data.workspace_id,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret,
        active: data.active ?? true,
        created_by: data.created_by,
        updated_by: data.created_by,
      })
      .returning();

    return webhook;
  },

  async findById(id: string) {
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.id, id), isNull(webhooks.deleted_at)))
      .limit(1);

    return webhook ?? null;
  },

  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.workspace_id, workspaceId),
          isNull(webhooks.deleted_at),
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
        updated_by: updatedBy,
        updated_at: new Date(),
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
        deleted_at: new Date(),
        deleted_by: deletedBy,
        updated_by: deletedBy,
        updated_at: new Date(),
      })
      .where(eq(webhooks.id, id));
  },
};

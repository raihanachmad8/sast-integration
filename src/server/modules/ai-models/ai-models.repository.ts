import { eq, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { models } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateAiModelInput {
  workspaceId: string;
  name: string;
  provider: string;
  base_url: string;
  api_key_encrypted?: string | null;
  role?: string;
  priority?: number;
  prompt_preset?: string;
  custom_system_prompt?: string | null;
}

export interface UpdateAiModelInput {
  name?: string;
  provider?: string;
  base_url?: string;
  api_key_encrypted?: string | null;
  role?: string;
  priority?: number;
  prompt_preset?: string;
  custom_system_prompt?: string | null;
}

export const aiModelsRepository = {
  async create(data: CreateAiModelInput, tx?: Tx) {
    const executor = tx ?? db;

    const [model] = await executor
      .insert(models)
      .values({
        workspace_id: data.workspaceId,
        name: data.name,
        provider: data.provider,
        base_url: data.base_url,
        api_key_encrypted: data.api_key_encrypted ?? null,
        role: data.role ?? 'fallback',
        priority: data.priority ?? 1,
        prompt_preset: data.prompt_preset ?? 'strict',
        custom_system_prompt: data.custom_system_prompt ?? null,
      })
      .returning();

    return model;
  },

  async findById(id: string, workspaceId?: string) {
    const conditions = [eq(models.id, id)];
    if (workspaceId) conditions.push(eq(models.workspace_id, workspaceId));
    const [model] = await db
      .select()
      .from(models)
      .where(and(...conditions))
      .limit(1);

    return model ?? null;
  },

  async findByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(models)
      .where(eq(models.workspace_id, workspaceId));
  },

  async update(id: string, workspaceId: string, data: UpdateAiModelInput, tx?: Tx) {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(models)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.base_url !== undefined && { base_url: data.base_url }),
        ...(data.api_key_encrypted !== undefined && { api_key_encrypted: data.api_key_encrypted }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.prompt_preset !== undefined && { prompt_preset: data.prompt_preset }),
        ...(data.custom_system_prompt !== undefined && { custom_system_prompt: data.custom_system_prompt }),
        updated_at: new Date(),
      })
      .where(and(eq(models.id, id), eq(models.workspace_id, workspaceId)))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(models)
      .where(and(eq(models.id, id), eq(models.workspace_id, workspaceId)));
  },
};

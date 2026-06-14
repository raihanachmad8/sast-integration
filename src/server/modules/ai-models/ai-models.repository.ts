import { eq, and, asc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { models } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface CreateAiModelInput {
  workspaceId: string;
  name: string;
  provider: string;
  baseUrl: string;
  apiKeyEncrypted?: string | null;
  role?: string;
  priority?: number;
  promptPreset?: string;
  customSystemPrompt?: string | null;
}

export interface UpdateAiModelInput {
  name?: string;
  provider?: string;
  baseUrl?: string;
  apiKeyEncrypted?: string | null;
  role?: string;
  priority?: number;
  promptPreset?: string;
  customSystemPrompt?: string | null;
}

export const aiModelsRepository = {
  async create(data: CreateAiModelInput, tx?: Tx) {
    const executor = tx ?? db;

    const [model] = await executor
      .insert(models)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        provider: data.provider,
        baseUrl: data.baseUrl,
        apiKeyEncrypted: data.apiKeyEncrypted ?? null,
        role: data.role ?? 'fallback',
        priority: data.priority ?? 1,
        promptPreset: data.promptPreset ?? 'strict',
        customSystemPrompt: data.customSystemPrompt ?? null,
      })
      .returning();

    return model;
  },

  async findById(id: string, workspaceId?: string) {
    const conditions = [eq(models.id, id)];
    if (workspaceId) conditions.push(eq(models.workspaceId, workspaceId));
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
      .where(eq(models.workspaceId, workspaceId))
      .orderBy(asc(models.priority));
  },

  async update(id: string, workspaceId: string, data: UpdateAiModelInput, tx?: Tx) {
    const executor = tx ?? db;

    const [updated] = await executor
      .update(models)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.provider !== undefined && { provider: data.provider }),
        ...(data.baseUrl !== undefined && { baseUrl: data.baseUrl }),
        ...(data.apiKeyEncrypted !== undefined && { apiKeyEncrypted: data.apiKeyEncrypted }),
        ...(data.role !== undefined && { role: data.role }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.promptPreset !== undefined && { promptPreset: data.promptPreset }),
        ...(data.customSystemPrompt !== undefined && { customSystemPrompt: data.customSystemPrompt }),
        updatedAt: new Date(),
      })
      .where(and(eq(models.id, id), eq(models.workspaceId, workspaceId)))
      .returning();

    return updated ?? null;
  },

  async delete(id: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(models)
      .where(and(eq(models.id, id), eq(models.workspaceId, workspaceId)));
  },
};

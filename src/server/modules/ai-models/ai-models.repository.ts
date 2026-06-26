import { eq, and, asc } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { models } from '@drizzle/schema/integrations';
import { logger } from '@/server/lib/logger';

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
  status?: string;
  lastTestedAt?: Date;
}

export const aiModelsRepository = {
  /**
   * Create a new AI model configuration record.
   * @param data - Model input data (workspaceId, name, provider, baseUrl, optional fields)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created model record
   */
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

  /**
   * Find an AI model by ID, optionally scoped to a workspace.
   * @param id - Model UUID
   * @param workspaceId - Optional workspace UUID for scoping
   * @returns Model record or null if not found
   */
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

  /**
   * List all AI model configurations in a workspace, ordered by priority ascending.
   * @param workspaceId - Workspace UUID
   * @returns Array of model records
   */
  async findByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(models)
      .where(eq(models.workspaceId, workspaceId))
      .orderBy(asc(models.priority));
  },

  /**
   * Update an AI model configuration record.
   * @param id - Model UUID
   * @param workspaceId - Workspace UUID for scoping
   * @param data - Fields to update
   * @param tx - Optional transaction context
   * @returns Updated model record or null if not found
   */
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

  /**
   * Delete an AI model configuration record.
   * @param id - Model UUID
   * @param workspaceId - Workspace UUID for scoping
   * @param tx - Optional transaction context
   */
  async delete(id: string, workspaceId: string, tx?: Tx) {
    const executor = tx ?? db;

    await executor
      .delete(models)
      .where(and(eq(models.id, id), eq(models.workspaceId, workspaceId)));
  },
};

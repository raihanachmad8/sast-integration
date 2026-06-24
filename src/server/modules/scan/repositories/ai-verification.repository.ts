import { eq, desc, and, asc, inArray } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { aiVerifications } from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';
export const aiVerificationRepository = {
  /**
   * Create an AI verification record.
   */
  async create(data: {
    findingId: string;
    groupId?: string;
    modelId?: string;
    verdict: string;
    confidence?: string;
    explanation?: string;
    dataFlow?: string;
    taintSource?: string;
    matchDetail?: string;
    likelyCwe?: unknown;
    fixSuggestion?: string;
    latencyMs?: number;
    rawResponse?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [verification] = await executor.insert(aiVerifications).values(data).returning();
    return verification;
  },

  /**
   * List all AI verifications for a finding.
   */
  async listByFinding(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt));
  },

  /**
   * Get the primary AI model.
   */
  async getPrimaryModel(tx?: Tx) {
    const executor = tx ?? db;
    const [model] = await executor.select().from(models)
      .where(eq(models.role, 'primary'))
      .orderBy(models.priority)
      .limit(1);
    return model ?? null;
  },

  /**
   * Get an AI model by ID.
   */
  async getModelById(modelId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [model] = await executor.select().from(models)
      .where(eq(models.id, modelId))
      .limit(1);
    return model ?? null;
  },

  /**
   * Get all fallback models ordered by priority.
   */
  async getFallbackModels(excludeModelId: string | null, tx?: Tx) {
    const executor = tx ?? db;
    if (excludeModelId) {
      return executor.select().from(models)
        .where(and(
          eq(models.role, 'fallback'),
        ))
        .orderBy(asc(models.priority));
    }
    return executor.select().from(models)
      .where(eq(models.role, 'fallback'))
      .orderBy(asc(models.priority));
  },

  /**
   * Get the latest AI verification for a finding.
   */
  async getLatestByFinding(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [verification] = await executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt))
      .limit(1);
    return verification ?? null;
  },

  /**
   * Get the latest AI verification for a finding group.
   * Used to skip re-verification if group already has a verified verdict.
   */
  async getLatestByGroup(groupId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [verification] = await executor.select().from(aiVerifications)
      .where(eq(aiVerifications.groupId, groupId))
      .orderBy(desc(aiVerifications.createdAt))
      .limit(1);
    return verification ?? null;
  },

  /**
   * Check if a finding group has any AI verification.
   * Returns true if at least one verification exists for the group.
   */
  async hasVerification(groupId: string, tx?: Tx): Promise<boolean> {
    const executor = tx ?? db;
    const [result] = await executor.select({ id: aiVerifications.id })
      .from(aiVerifications)
      .where(eq(aiVerifications.groupId, groupId))
      .limit(1);
    return !!result;
  },

  /**
   * Batch check which groups have AI verification.
   * Returns array of group IDs that have at least one verification.
   */
  async hasVerificationBatch(groupIds: string[], tx?: Tx): Promise<string[]> {
    if (groupIds.length === 0) return [];
    const executor = tx ?? db;
    const results = await executor.select({ groupId: aiVerifications.groupId })
      .from(aiVerifications)
      .where(inArray(aiVerifications.groupId, groupIds))
      .groupBy(aiVerifications.groupId);
    return results.map((r) => r.groupId).filter((id): id is string => id !== null);
  },
};

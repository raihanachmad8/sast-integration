import { eq, desc } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { aiVerifications } from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const aiVerificationRepository = {
  /**
   * Create an AI verification record.
   * @param data - Verification insert data
   * @param tx - Optional transaction context
   * @returns Created verification record
   */
  async create(data: {
    findingId: string;
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
   * @param findingId - Finding UUID
   * @param tx - Optional transaction context
   * @returns Array of verification records ordered by creation date
   */
  async listByFinding(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt));
  },

  /**
   * Get the primary AI model (highest priority with 'primary' role).
   * @param tx - Optional transaction context
   * @returns Primary model record or null
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
   * @param modelId - Model UUID
   * @param tx - Optional transaction context
   * @returns Model record or null
   */
  async getModelById(modelId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [model] = await executor.select().from(models)
      .where(eq(models.id, modelId))
      .limit(1);
    return model ?? null;
  },

  /**
   * Get the latest AI verification for a finding.
   * @param findingId - Finding UUID
   * @param tx - Optional transaction context
   * @returns Latest verification record or null
   */
  async getLatestByFinding(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    const [verification] = await executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt))
      .limit(1);
    return verification ?? null;
  },
};

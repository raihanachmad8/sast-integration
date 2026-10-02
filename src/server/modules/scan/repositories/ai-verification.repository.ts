import { db } from '@/server/db/client';
import { findings, aiVerifications, type NewAiVerification } from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';
import { eq, and } from 'drizzle-orm';

/**
 * AI verification repository providing database operations for AI verification results.
 *
 * Manages the storage and retrieval of AI verification verdicts for findings.
 */
export const aiVerificationRepository = {
  /**
   * Insert an AI verification record for a finding.
   *
   * @param data - Verification data from AI model
   * @returns Created verification record
   */
  async create(data: NewAiVerification) {
    const [inserted] = await db
      .insert(aiVerifications)
      .values(data)
      .returning();

    return inserted;
  },

  /**
   * Get all verifications for a finding.
   *
   * @param findingId - Finding UUID
   * @returns Array of verification records
   */
  async listByFinding(findingId: string) {
    return db
      .select()
      .from(aiVerifications)
      .where(eq(aiVerifications.finding_id, findingId));
  },

  /**
   * Get the primary AI model for a workspace.
   * Returns the model with role='primary' or the first available model.
   *
   * @param workspaceId - Workspace UUID
   * @returns AI model record or null
   */
  async getPrimaryModel(workspaceId: string) {
    const [model] = await db
      .select()
      .from(models)
      .where(and(
        eq(models.workspace_id, workspaceId),
        eq(models.role, 'primary'),
      ))
      .limit(1);

    if (model) return model;

    // Fallback: get any available model
    const [fallback] = await db
      .select()
      .from(models)
      .where(eq(models.workspace_id, workspaceId))
      .limit(1);

    return fallback ?? null;
  },

  /**
   * Get findings that need AI verification for a scan.
   * Returns findings without existing verifications.
   *
   * @param scanId - Scan UUID
   * @returns Array of findings needing verification
   */
  async getFindingsForVerification(scanId: string) {
    return db
      .select({
        id: findings.id,
        rule: findings.rule,
        file_path: findings.file_path,
        line_number: findings.line_number,
        message: findings.message,
        scanner: findings.scanner,
        cwe_id: findings.cwe_id,
      })
      .from(findings)
      .where(eq(findings.scan_id, scanId));
  },
};

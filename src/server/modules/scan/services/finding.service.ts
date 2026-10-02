import { db } from '@/server/db/client';
import { findingGroups, findings, type NewFinding, type NewFindingGroup } from '@drizzle/schema/findings';
import { eq } from 'drizzle-orm';
import { generateFindingFingerprint } from './finding.fingerprint';
import { FINDING_TITLE_FINGERPRINT_MAX_LENGTH, FINDING_TITLE_MESSAGE_MAX_LENGTH } from '../constants';
import { findingRepository } from '../repositories/finding.repository';

export type CreateFindingInput = Omit<NewFinding, 'id' | 'created_at' | 'updated_at'>;

// Re-export the pure fingerprint generator for convenience and testability
export { generateFindingFingerprint } from './finding.fingerprint';

/**
 * Finds an existing `finding_groups` row by fingerprint or creates a new one.
 *
 * This function also updates `last_seen_at` on every access, which is useful
 * for showing "when this issue was last detected".
 *
 * @param input.projectId - Required for scoping groups per project
 * @param input.fingerprint - The stable key produced by `generateFindingFingerprint`
 */
export async function findOrCreateFindingGroup(input: {
  projectId: string;
  fingerprint: string;
  title?: string;
}) {
  const [existing] = await db
    .select()
    .from(findingGroups)
    .where(eq(findingGroups.fingerprint, input.fingerprint))
    .limit(1);

  if (existing) {
    await db
      .update(findingGroups)
      .set({ last_seen_at: new Date() })
      .where(eq(findingGroups.id, existing.id));

    return existing;
  }

  const [group] = await db
    .insert(findingGroups)
    .values({
      project_id: input.projectId,
      fingerprint: input.fingerprint,
      title: input.title || input.fingerprint.substring(0, FINDING_TITLE_FINGERPRINT_MAX_LENGTH),
    } as NewFindingGroup)
    .returning();

  return group;
}

/**
 * High-level service responsible for persisting parsed scanner findings
 * with automatic deduplication via the `finding_groups` table.
 */
export const findingService = {
  /**
   * Bulk creates findings while ensuring proper linkage to `finding_groups`.
   *
   * This is the **recommended** method to use after parsing any scanner report.
   * It guarantees that the same logical vulnerability across different scans
   * and branches will be grouped together.
   *
   * @param projectId - The project these findings belong to (used for grouping scope)
   * @param scanId - The scan these findings were discovered in
   * @param inputs - Array of normalized findings from any parser
   */
  async createManyWithDedup(
    projectId: string,
    scanId: string,
    inputs: CreateFindingInput[]
  ) {
    if (inputs.length === 0) return [];

    const created = [];

    for (const input of inputs) {
      const fingerprint = generateFindingFingerprint({
        rule: input.rule ?? '',
        file_path: input.file_path,
        line_number: input.line_number,
        message: input.message,
      });

      const group = await findOrCreateFindingGroup({
        projectId,
        fingerprint,
        title: input.rule || input.message?.slice(0, FINDING_TITLE_MESSAGE_MAX_LENGTH),
      });

      const [finding] = await db
        .insert(findings)
        .values({
          ...input,
          scan_id: scanId,
          group_id: group.id,
        })
        .returning();

      created.push(finding);
    }

    return created;
  },

  /**
   * List findings for a project with optional filters.
   *
   * Supports filtering by scanId, status, severity, scanner, assignedTo.
   * Returns findings with group info for display purposes.
   *
   * @param projectId - Project UUID for data isolation
   * @param filters - Optional filter criteria
   * @param limit - Maximum results (default 50)
   */
  async list(projectId: string, filters: {
    scanId?: string;
    status?: string;
    severity?: string;
    scanner?: string;
    assignedTo?: string;
  } = {}, limit = 50) {
    return findingRepository.listByProject(projectId, filters, limit);
  },

  /**
   * Get a single finding by ID with group info and AI verifications.
   *
   * @param findingId - Finding UUID
   * @returns Finding record with group info and AI verifications
   */
  async getById(findingId: string) {
    const finding = await findingRepository.findById(findingId);
    if (!finding) return null;

    const verifications = await findingRepository.getVerifications(findingId);

    return {
      ...finding,
      ai_verifications: verifications,
    };
  },

  /**
   * Update finding status with history tracking.
   *
   * Valid statuses: open, fixed, false_positive, ignored
   *
   * @param findingId - Finding UUID
   * @param status - New status
   * @param userId - User performing the update
   */
  async updateStatus(findingId: string, status: string, userId: string) {
    const validStatuses = ['open', 'fixed', 'false_positive', 'ignored'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const result = await findingRepository.updateStatus(findingId, status, userId);
    if (!result) {
      throw new Error('Finding not found');
    }

    return result;
  },

  /**
   * Assign or unassign a finding to a user.
   *
   * @param findingId - Finding UUID
   * @param assignedTo - User UUID to assign to (null to unassign)
   */
  async assign(findingId: string, assignedTo: string | null) {
    return findingRepository.updateAssignment(findingId, assignedTo);
  },
};

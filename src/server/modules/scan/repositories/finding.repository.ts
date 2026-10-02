import { db } from '@/server/db/client';
import { findings, findingGroups, aiVerifications, findingHistory, type NewFinding } from '@drizzle/schema/findings';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Finding repository providing database operations for findings management.
 *
 * All methods are scoped to a specific project for data isolation.
 * Findings are linked to finding_groups via group_id for deduplication.
 */
export const findingRepository = {
  /**
   * Bulk creates findings while ensuring proper linkage to finding_groups.
   *
   * @param data - Array of normalized findings from any parser
   * @returns Array of created finding records
   */
  async createMany(data: NewFinding[]) {
    if (data.length === 0) return [];

    const inserted = await db
      .insert(findings)
      .values(data)
      .returning();

    return inserted;
  },

  /**
   * Create a single finding record.
   *
   * @param data - Normalized finding data
   * @returns Created finding record
   */
  async create(data: NewFinding) {
    const [inserted] = await db
      .insert(findings)
      .values(data)
      .returning();

    return inserted;
  },

  /**
   * List findings for a project with optional filters.
   *
   * Supports filtering by:
   * - scanId: Specific scan
   * - status: open, fixed, false_positive, ignored
   * - severity: critical, high, medium, low, info
   * - scanner: semgrep, gitleaks, trivy, etc.
   * - assignedTo: User UUID
   *
   * @param projectId - Project UUID for data isolation
   * @param filters - Optional filter criteria
   * @param limit - Maximum results (default 50)
   * @returns Array of finding records with group info
   */
  async listByProject(
    projectId: string,
    filters: {
      scanId?: string;
      status?: string;
      severity?: string;
      scanner?: string;
      assignedTo?: string;
    } = {},
    limit = 50
  ) {
    const conditions = [eq(findingGroups.project_id, projectId)];

    if (filters.scanId) {
      conditions.push(eq(findings.scan_id, filters.scanId));
    }
    if (filters.status) {
      conditions.push(eq(findings.status, filters.status));
    }
    if (filters.severity) {
      conditions.push(eq(findings.severity, filters.severity));
    }
    if (filters.scanner) {
      conditions.push(eq(findings.scanner, filters.scanner));
    }
    if (filters.assignedTo) {
      conditions.push(eq(findings.assigned_to, filters.assignedTo));
    }

    return db
      .select({
        id: findings.id,
        scan_id: findings.scan_id,
        group_id: findings.group_id,
        severity: findings.severity,
        status: findings.status,
        file_path: findings.file_path,
        line_number: findings.line_number,
        rule: findings.rule,
        scanner: findings.scanner,
        message: findings.message,
        cwe_id: findings.cwe_id,
        assigned_to: findings.assigned_to,
        created_at: findings.created_at,
        updated_at: findings.updated_at,
        group_title: findingGroups.title,
        group_fingerprint: findingGroups.fingerprint,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
      .where(and(...conditions))
      .orderBy(desc(findings.created_at))
      .limit(limit);
  },

  /**
   * Get a single finding by ID with group info.
   *
   * @param findingId - Finding UUID
   * @returns Finding record with group info, or null if not found
   */
  async findById(findingId: string) {
    const [result] = await db
      .select({
        id: findings.id,
        scan_id: findings.scan_id,
        group_id: findings.group_id,
        project_id: findingGroups.project_id,
        severity: findings.severity,
        status: findings.status,
        file_path: findings.file_path,
        line_number: findings.line_number,
        code_snippet: findings.code_snippet,
        description: findings.description,
        rule: findings.rule,
        scanner: findings.scanner,
        message: findings.message,
        cwe_id: findings.cwe_id,
        assigned_to: findings.assigned_to,
        created_at: findings.created_at,
        updated_at: findings.updated_at,
        group_title: findingGroups.title,
        group_fingerprint: findingGroups.fingerprint,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
      .where(eq(findings.id, findingId))
      .limit(1);

    return result ?? null;
  },

  /**
   * Update finding status and record history.
   *
   * @param findingId - Finding UUID
   * @param status - New status (open, fixed, false_positive, ignored)
   * @param userId - User performing the update
   */
  async updateStatus(findingId: string, status: string, userId: string) {
    // Get current status for history
    const [current] = await db
      .select({ status: findings.status })
      .from(findings)
      .where(eq(findings.id, findingId))
      .limit(1);

    if (!current) return null;

    // Update finding
    await db
      .update(findings)
      .set({
        status,
        updated_at: new Date(),
      })
      .where(eq(findings.id, findingId));

    // Record history
    await db
      .insert(findingHistory)
      .values({
        finding_id: findingId,
        field: 'status',
        old_value: current.status,
        new_value: status,
        created_by: userId,
      });

    return { id: findingId, status, previousStatus: current.status };
  },

  /**
   * Update finding assignment.
   *
   * @param findingId - Finding UUID
   * @param assignedTo - User UUID to assign to (null to unassign)
   */
  async updateAssignment(findingId: string, assignedTo: string | null) {
    await db
      .update(findings)
      .set({
        assigned_to: assignedTo,
        updated_at: new Date(),
      })
      .where(eq(findings.id, findingId));

    return { id: findingId, assigned_to: assignedTo };
  },

  /**
   * Get AI verifications for a finding.
   *
   * @param findingId - Finding UUID
   * @returns Array of AI verification records
   */
  async getVerifications(findingId: string) {
    return db
      .select()
      .from(aiVerifications)
      .where(eq(aiVerifications.finding_id, findingId))
      .orderBy(desc(aiVerifications.created_at));
  },
};

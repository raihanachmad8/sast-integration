import { eq, and, desc, count, sql, inArray, isNull, type InferInsertModel } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups, aiVerifications, findingHistory } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';
import { models } from '@drizzle/schema/integrations';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const findingRepository = {
  /**
   * Bulk insert findings.
   * @param findingsData - Array of finding insert data
   * @param tx - Optional transaction context
   * @returns Array of created finding records
   */
  async createMany(findingsData: Array<{
    scanId: string;
    groupId?: string;
    cweId?: string;
    severity: string;
    status?: string;
    filePath?: string;
    lineNumber?: number;
    codeSnippet?: string;
    description?: string;
    rule?: string;
    scanner?: string;
    message?: string;
    assignedTo?: string;
  }>, tx?: Tx) {
    const executor = tx ?? db;
    if (findingsData.length === 0) return [];
    return executor.insert(findings).values(findingsData).returning();
  },

  /**
   * Insert a single finding.
   * @param data - Finding insert data
   * @param tx - Optional transaction context
   * @returns Created finding record
   */
  async create(
    data: Omit<InferInsertModel<typeof findings>, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    // Filter out null values — Drizzle insert expects undefined for absent fields
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null),
    ) as unknown as InferInsertModel<typeof findings>;
    const [finding] = await executor.insert(findings).values(cleaned).returning();
    return finding;
  },

  /**
   * List findings for a project with pagination and filters.
   * @param projectId - Project UUID
   * @param params - Pagination and filter params
   * @param tx - Optional transaction context
   * @returns Paginated finding list with total count
   */
  async listByProject(projectId: string, params: {
    page: number;
    perPage: number;
    severity?: string;
    status?: string;
    scanner?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = (params.page - 1) * params.perPage;

    const conditions = [eq(findings.active, true)];
    if (params.severity) conditions.push(eq(findings.severity, params.severity));
    if (params.status) conditions.push(eq(findings.status, params.status));
    if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));

    const whereClause = and(...conditions);

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      status: findings.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findingGroups.projectId, projectId), whereClause))
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    const [{ total }] = await executor.select({ total: count() }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findingGroups.projectId, projectId), whereClause));

    return { data, total };
  },

  /**
   * List findings across all projects in a workspace.
   * @param workspaceId - Workspace UUID
   * @param params - Pagination and filter params
   * @param tx - Optional transaction context
   * @returns Paginated finding list with total count
   */
  async listByWorkspace(workspaceId: string, params: {
    page: number;
    perPage: number;
    severity?: string;
    status?: string;
    scanner?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = (params.page - 1) * params.perPage;

    const conditions = [];
    if (params.severity) conditions.push(eq(findings.severity, params.severity));
    if (params.status) conditions.push(eq(findings.status, params.status));
    if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));

    const workspaceFilter = and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt), eq(findings.active, true));
    const whereClause = conditions.length > 0 ? and(workspaceFilter, and(...conditions)) : workspaceFilter;

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      status: findings.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      codeSnippet: findings.codeSnippet,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      repositoryName: repositories.name,
      verdict: sql<string | null>`CASE WHEN ${aiVerifications.verdict} = 'true_positive' THEN 'TP' WHEN ${aiVerifications.verdict} = 'false_positive' THEN 'FP' ELSE 'Pending' END`,
      model: models.name,
      confidence: aiVerifications.confidence,
      explanation: aiVerifications.explanation,
      fixSuggestion: aiVerifications.fixSuggestion,
      dataFlow: aiVerifications.dataFlow,
      taintSource: aiVerifications.taintSource,
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .leftJoin(aiVerifications, eq(findings.id, aiVerifications.findingId))
      .leftJoin(models, eq(aiVerifications.modelId, models.id))
      .where(whereClause)
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    const [{ total }] = await executor.select({ total: count() }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .where(whereClause);

    // Deduplicate: keep only the latest AI verification per finding
    const seen = new Map<string, typeof data[number]>();
    for (const row of data) {
      const existing = seen.get(row.id);
      if (!existing || (row.createdAt && existing.createdAt && row.createdAt > existing.createdAt)) {
        seen.set(row.id, row);
      }
    }

    return { data: Array.from(seen.values()), total };
  },

  /**
   * List findings by scan ID.
   * @param scanId - Scan UUID
   * @param params - Pagination and filter params
   * @param tx - Optional transaction context
   * @returns Paginated finding list with total count
   */
  async listByScan(scanId: string, params: {
    page: number;
    perPage: number;
    status?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = (params.page - 1) * params.perPage;

    const conditions = [eq(findings.scanId, scanId), eq(findings.active, true)];
    if (params.status) conditions.push(eq(findings.status, params.status));

    const whereClause = and(...conditions);

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      status: findings.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      repositoryName: repositories.name,
      verdict: sql<string | null>`CASE WHEN ${aiVerifications.verdict} = 'true_positive' THEN 'TP' WHEN ${aiVerifications.verdict} = 'false_positive' THEN 'FP' ELSE 'Pending' END`,
      model: models.name,
      confidence: aiVerifications.confidence,
    }).from(findings)
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .leftJoin(aiVerifications, eq(findings.id, aiVerifications.findingId))
      .leftJoin(models, eq(aiVerifications.modelId, models.id))
      .where(whereClause)
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    const [{ total }] = await executor.select({ total: count() }).from(findings)
      .where(whereClause);

    return { data, total };
  },

  /**
   * Get a finding by ID.
   * @param id - Finding UUID
   * @param tx - Optional transaction context
   * @returns Finding record or null
   */
  async findById(id: string, tx?: Tx) {
    const executor = tx ?? db;
    const [finding] = await executor.select().from(findings).where(eq(findings.id, id)).limit(1);
    return finding ?? null;
  },

  /**
   * Update finding status and record the change in finding history.
   * @param id - Finding UUID
   * @param status - New status value
   * @param userId - User UUID who performed the change (null for system/automated)
   * @param tx - Optional transaction context
   * @returns Updated finding record
   */
  async updateStatus(id: string, status: string, userId: string | null, tx?: Tx) {
    const executor = tx ?? db;

    const [oldFinding] = await executor.select({ status: findings.status })
      .from(findings).where(eq(findings.id, id)).limit(1);

    const [finding] = await executor.update(findings)
      .set({ status, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();

    if (finding && oldFinding) {
      await executor.insert(findingHistory).values({
        findingId: id,
        field: 'status',
        oldValue: oldFinding.status,
        newValue: status,
        createdBy: userId,
      });
    }

    return finding;
  },

  /**
   * Update finding assignee.
   * @param id - Finding UUID
   * @param assigneeId - User UUID of new assignee (null to unassign)
   * @param tx - Optional transaction context
   * @returns Updated finding record
   */
  async updateAssignment(id: string, assigneeId: string | null, tx?: Tx) {
    const executor = tx ?? db;
    const [finding] = await executor.update(findings)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();
    return finding;
  },

  /**
   * Get AI verifications for a finding.
   * @param findingId - Finding UUID
   * @param tx - Optional transaction context
   * @returns Array of AI verification records
   */
  async getVerifications(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt));
  },

  /**
   * Find an existing finding group by fingerprint or create a new one.
   * Uses ON CONFLICT DO NOTHING to handle race conditions safely.
   * Updates lastSeenAt on every access for staleness tracking.
   * @param projectId - Project UUID for group scoping
   * @param fingerprint - Unique fingerprint for the finding group
   * @param title - Human-readable title (defaults to truncated fingerprint)
   * @param tx - Optional transaction context
   * @returns The finding group record (existing or newly created)
   */
  async findOrCreateFindingGroup(
    projectId: string,
    fingerprint: string,
    title: string,
    tx?: Tx,
  ) {
    const executor = tx ?? db;

    const [group] = await executor
      .insert(findingGroups)
      .values({ projectId, fingerprint, title })
      .onConflictDoNothing()
      .returning();

    if (group) return group;

    const [existing] = await executor
      .select()
      .from(findingGroups)
      .where(eq(findingGroups.fingerprint, fingerprint))
      .limit(1);

    if (existing) {
      await executor
        .update(findingGroups)
        .set({ lastSeenAt: new Date() })
        .where(eq(findingGroups.id, existing.id));
    }

    return existing!;
  },

  /**
   * Batch: find or create multiple finding groups at once.
   * Groups are scoped by repositoryId — same fingerprint in different repos creates separate groups.
   */
  async findOrCreateFindingGroups(
    projectId: string | null,
    repositoryId: string | null,
    entries: { fingerprint: string; title: string }[],
    tx?: Tx,
  ): Promise<Map<string, { id: string; fingerprint: string }>> {
    if (entries.length === 0) return new Map();
    const executor = tx ?? db;

    // 1. Try to insert all at once (conflicts on repo+fingerprint are silently ignored)
    await executor
      .insert(findingGroups)
      .values(entries.map((e) => ({
        projectId: projectId ?? null,
        repositoryId: repositoryId ?? null,
        fingerprint: e.fingerprint,
        title: e.title,
      })))
      .onConflictDoNothing();

    // 2. Fetch all groups for this repo + these fingerprints
    const fingerprints = entries.map((e) => e.fingerprint);
    const repoCondition = repositoryId
      ? eq(findingGroups.repositoryId, repositoryId)
      : isNull(findingGroups.repositoryId);
    const groups = await executor
      .select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint })
      .from(findingGroups)
      .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));

    // 3. Batch update lastSeenAt for all existing groups
    if (groups.length > 0) {
      await executor
        .update(findingGroups)
        .set({ lastSeenAt: new Date() })
        .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));
    }

    return new Map(groups.map((g) => [g.fingerprint, g]));
  },

  /**
   * List all active findings for deduplication during scan replacement.
   * Supports both project-scoped and repo-scoped dedup.
   * @param projectId - Project UUID (optional if repositoryId provided)
   * @param repositoryId - Repository UUID (optional if projectId provided)
   * @param scanId - Exclude findings from this scan (current scan)
   * @param scanner - Filter by scanner name
   * @param tx - Optional transaction context
   * @returns Array of { id, fingerprint, scanId } for active findings
   */
  async listActiveFindingsByProject(projectId: string | null, repositoryId: string | null, scanId?: string, scanner?: string, tx?: Tx) {
    const executor = tx ?? db;
    const conditions = [
      eq(findings.active, true),
    ];

    if (projectId) {
      conditions.push(eq(findingGroups.projectId, projectId));
    } else if (repositoryId) {
      conditions.push(eq(findingGroups.repositoryId, repositoryId));
    }

    if (scanId) {
      conditions.push(eq(findings.scanId, scanId));
    }
    if (scanner) {
      conditions.push(eq(findings.scanner, scanner));
    }
    return executor
      .select({
        id: findings.id,
        fingerprint: findingGroups.fingerprint,
        scanId: findings.scanId,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(...conditions));
  },

  /**
   * Bulk mark findings as superseded (active=false) without changing status.
   * @param findingIds - Array of finding UUIDs to supersede
   * @param tx - Optional transaction context
   */
  async markSupersededBulk(findingIds: string[], tx?: Tx) {
    if (findingIds.length === 0) return;
    const executor = tx ?? db;
    await executor
      .update(findings)
      .set({ active: false })
      .where(sql`${findings.id} in ${findingIds}`);
  },

  /**
   * Bulk mark findings as resolved (active=false, status='fixed').
   * @param findingIds - Array of finding UUIDs to resolve
   * @param tx - Optional transaction context
   */
  async markResolvedBulk(findingIds: string[], tx?: Tx) {
    if (findingIds.length === 0) return;
    const executor = tx ?? db;
    await executor
      .update(findings)
      .set({ active: false, status: 'fixed' })
      .where(sql`${findings.id} in ${findingIds}`);
  },

  /**
   * Count findings by severity for a project.
   * @param projectId - Project UUID
   * @param tx - Optional transaction context
   * @returns Array of { severity, count } objects
   */
  async countBySeverity(projectId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select({
      severity: findings.severity,
      count: count(findings.id),
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findingGroups.projectId, projectId), eq(findings.active, true)))
      .groupBy(findings.severity);
  },

  /**
   * Get the latest completed scan for a branch.
   * @param repositoryId - Repository UUID
   * @param branch - Branch name
   * @param tx - Optional transaction context
   * @returns Latest completed scan or null
   */
  async findLatestScanByBranch(repositoryId: string, branch: string, tx?: Tx) {
    const executor = tx ?? db;
    const [scan] = await executor
      .select()
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        eq(scans.branch, branch),
        eq(scans.status, 'completed'),
      ))
      .orderBy(sql`${scans.createdAt} DESC`)
      .limit(1);
    return scan ?? null;
  },

  /**
   * List active findings on a specific branch (from latest completed scan).
   * @param repositoryId - Repository UUID
   * @param branch - Branch name
   * @param filters - Optional filters (scanner, severity)
   * @param pagination - Pagination params
   * @param tx - Optional transaction context
   */
  async listByBranch(
    repositoryId: string,
    branch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const offset = (pagination.page - 1) * pagination.perPage;

    const conditions = [
      eq(scans.repositoryId, repositoryId),
      eq(scans.branch, branch),
      eq(scans.status, 'completed'),
      eq(findings.active, true),
    ];
    if (filters.scanner) conditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) conditions.push(eq(findings.severity, filters.severity));

    const data = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        status: findings.status,
        filePath: findings.filePath,
        lineNumber: findings.lineNumber,
        codeSnippet: findings.codeSnippet,
        description: findings.description,
        rule: findings.rule,
        scanner: findings.scanner,
        message: findings.message,
        createdAt: findings.createdAt,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(...conditions))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(...conditions));

    return { data, total };
  },

  /**
   * Find new findings on head branch that don't exist on base branch (PR diff).
   * Compares fingerprints across branches.
   * @param repositoryId - Repository UUID
   * @param headBranch - PR head branch
   * @param baseBranch - PR base branch
   * @param filters - Optional filters (scanner, severity)
   * @param pagination - Pagination params
   * @param tx - Optional transaction context
   */
  async diffNewFindings(
    repositoryId: string,
    headBranch: string,
    baseBranch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const offset = (pagination.page - 1) * pagination.perPage;

    const baseConditions = [
      eq(scans.repositoryId, repositoryId),
      eq(findings.active, true),
    ];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    // Subquery: fingerprints present on base branch
    const baseFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.repositoryId, repositoryId),
        eq(scans.branch, baseBranch),
        eq(scans.status, 'completed'),
        eq(findings.active, true),
      ));

    // Main query: findings on head branch whose fingerprint is NOT on base branch
    const data = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        status: findings.status,
        filePath: findings.filePath,
        lineNumber: findings.lineNumber,
        codeSnippet: findings.codeSnippet,
        description: findings.description,
        rule: findings.rule,
        scanner: findings.scanner,
        message: findings.message,
        createdAt: findings.createdAt,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.branch, headBranch),
        eq(scans.status, 'completed'),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${baseFingerprints})`,
      ))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.branch, headBranch),
        eq(scans.status, 'completed'),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${baseFingerprints})`,
      ));

    return { data, total };
  },

  /**
   * Find fixed findings on head branch (exist on base but not on head).
   * @param repositoryId - Repository UUID
   * @param headBranch - PR head branch
   * @param baseBranch - PR base branch
   * @param filters - Optional filters (scanner, severity)
   * @param pagination - Pagination params
   * @param tx - Optional transaction context
   */
  async diffFixedFindings(
    repositoryId: string,
    headBranch: string,
    baseBranch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const offset = (pagination.page - 1) * pagination.perPage;

    const baseConditions = [
      eq(scans.repositoryId, repositoryId),
      eq(findings.active, true),
    ];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    // Subquery: fingerprints present on head branch
    const headFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.repositoryId, repositoryId),
        eq(scans.branch, headBranch),
        eq(scans.status, 'completed'),
        eq(findings.active, true),
      ));

    // Main query: findings on base branch whose fingerprint is NOT on head branch
    const data = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        status: findings.status,
        filePath: findings.filePath,
        lineNumber: findings.lineNumber,
        codeSnippet: findings.codeSnippet,
        description: findings.description,
        rule: findings.rule,
        scanner: findings.scanner,
        message: findings.message,
        createdAt: findings.createdAt,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.branch, baseBranch),
        eq(scans.status, 'completed'),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${headFingerprints})`,
      ))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .where(and(
        eq(scans.branch, baseBranch),
        eq(scans.status, 'completed'),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${headFingerprints})`,
      ));

    return { data, total };
  },
};

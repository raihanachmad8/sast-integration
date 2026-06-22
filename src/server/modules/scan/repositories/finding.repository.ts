import { eq, and, or, desc, count, sql, inArray, isNull, ilike, type InferInsertModel } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { getOffset } from '@/lib/pagination';
import { findings, findingGroups, aiVerifications, findingHistory, findingGroupScans } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { repositories } from '@drizzle/schema/source-controls';
import { models } from '@drizzle/schema/integrations';
import type { ChangedFile } from '@/server/modules/source-control/scm-api.service';
import { logger } from '@/server/lib/logger';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Strip Docker workspace prefix from absolute file paths.
 * /workspace/Owner/repo/file.c → file.c
 * Matches SCM API relative paths for comparison.
 */
function stripDockerPrefix(filePath: string): string {
  const match = filePath.match(/^\/workspace\/[^/]+\/[^/]+\/(.+)$/);
  return match ? match[1] : filePath;
}

export const findingRepository = {
  /**
   * Bulk insert findings.
   */
  async createMany(findingsData: Array<{
    scanId: string;
    groupId?: string;
    cweId?: string;
    severity: string;
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
   */
  async create(
    data: Omit<InferInsertModel<typeof findings>, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null),
    ) as unknown as InferInsertModel<typeof findings>;
    const [finding] = await executor.insert(findings).values(cleaned).returning();
    return finding;
  },

  /**
   * List findings for a project with pagination and filters.
   * Filters by finding_groups.status (not findings.status).
   */
  async listByProject(projectId: string, params: {
    page: number;
    perPage: number;
    severity?: string;
    status?: string;
    scanner?: string;
    repositoryId?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);

    const statusFilter = params.status || 'open';
    const conditions = [eq(findingGroups.status, statusFilter)];
    if (params.severity) conditions.push(eq(findings.severity, params.severity));
    if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));
    if (params.repositoryId) conditions.push(eq(findingGroups.repositoryId, params.repositoryId));

    const whereClause = and(...conditions);

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      groupStatus: findingGroups.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      firstSeenAt: findingGroups.firstSeenAt,
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
   */
  async listByWorkspace(workspaceId: string, params: {
    page: number;
    perPage: number;
    severity?: string;
    status?: string;
    scanner?: string;
    repositoryId?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);

    const statusFilter = params.status || 'open';
    const conditions = [];
    if (params.severity) conditions.push(eq(findings.severity, params.severity));
    if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));
    if (params.repositoryId) conditions.push(eq(findingGroups.repositoryId, params.repositoryId));

    const workspaceFilter = and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt), eq(findingGroups.status, statusFilter));
    const whereClause = conditions.length > 0 ? and(workspaceFilter, and(...conditions)) : workspaceFilter;

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      projectId: findingGroups.projectId,
      cweId: findings.cweId,
      severity: findings.severity,
      groupStatus: findingGroups.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      codeSnippet: findings.codeSnippet,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      firstSeenAt: findingGroups.firstSeenAt,
      repositoryName: repositories.name,
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(whereClause)
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    // Fetch AI verifications separately to avoid LEFT JOIN duplicate rows
    const findingIds = data.map((r) => r.id);
    const aiData = findingIds.length > 0
      ? await executor.select({
          findingId: aiVerifications.findingId,
          verdict: aiVerifications.verdict,
          confidence: aiVerifications.confidence,
          explanation: aiVerifications.explanation,
          fixSuggestion: aiVerifications.fixSuggestion,
          dataFlow: aiVerifications.dataFlow,
          taintSource: aiVerifications.taintSource,
          matchDetail: aiVerifications.matchDetail,
          likelyCwe: aiVerifications.likelyCwe,
          modelName: models.name,
        }).from(aiVerifications)
          .leftJoin(models, eq(aiVerifications.modelId, models.id))
          .where(inArray(aiVerifications.findingId, findingIds))
      : [];

    const aiMap = new Map<string, typeof aiData[number]>();
    for (const row of aiData) {
      if (!row.findingId) continue;
      const existing = aiMap.get(row.findingId);
      if (!existing) aiMap.set(row.findingId, row);
    }

    const enrichedData = data.map((row) => {
      const ai = row.id ? aiMap.get(row.id) : undefined;
      return {
        ...row,
        verdict: ai ? (ai.verdict === 'true_positive' ? 'TP' : ai.verdict === 'false_positive' ? 'FP' : 'Pending') : 'Pending',
        model: ai?.modelName ?? null,
        confidence: ai?.confidence ?? null,
        explanation: ai?.explanation ?? null,
        fixSuggestion: ai?.fixSuggestion ?? null,
        dataFlow: ai?.dataFlow ?? null,
        taintSource: ai?.taintSource ?? null,
        matchDetail: ai?.matchDetail ?? null,
        likelyCwe: ai?.likelyCwe ?? null,
      };
    });

    const [{ total }] = await executor.select({ total: count(sql`DISTINCT ${findingGroups.id}`) }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .where(whereClause);

    return { data: enrichedData, total };
  },

  /**
   * List findings scoped to user's accessible projects.
   */
  async listAccessible(workspaceId: string, accessibleProjectIds: string[], params: {
    page: number;
    perPage: number;
    severity?: string;
    status?: string;
    scanner?: string;
    search?: string;
    repositoryId?: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);

    const statusFilter = params.status || 'open';
    const conditions = [eq(findingGroups.status, statusFilter)];
    if (params.severity) conditions.push(eq(findings.severity, params.severity));
    if (params.scanner) conditions.push(eq(findings.scanner, params.scanner));
    if (params.repositoryId) conditions.push(eq(scans.repositoryId, params.repositoryId));
    if (params.search) {
      const searchCondition = or(
        ilike(findings.filePath, `%${params.search}%`),
        ilike(findings.description, `%${params.search}%`),
        ilike(findings.rule, `%${params.search}%`),
        ilike(findings.message, `%${params.search}%`),
      );
      if (searchCondition) conditions.push(searchCondition);
    }

    const workspaceFilter = eq(projects.workspaceId, workspaceId);

    const projectScope = accessibleProjectIds.length > 0
      ? or(
          inArray(findingGroups.projectId, accessibleProjectIds),
          isNull(repositories.projectId),
        )
      : isNull(repositories.projectId);

    const whereClause = conditions.length > 0
      ? and(workspaceFilter, projectScope, and(...conditions))
      : and(workspaceFilter, projectScope);

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      projectId: findingGroups.projectId,
      cweId: findings.cweId,
      severity: findings.severity,
      groupStatus: findingGroups.status,
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
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(whereClause)
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    // Fetch AI verifications separately to avoid LEFT JOIN duplicate rows
    const findingIds = data.map((r) => r.id);
    const aiData = findingIds.length > 0
      ? await executor.select({
          findingId: aiVerifications.findingId,
          verdict: aiVerifications.verdict,
          confidence: aiVerifications.confidence,
          explanation: aiVerifications.explanation,
          fixSuggestion: aiVerifications.fixSuggestion,
          dataFlow: aiVerifications.dataFlow,
          taintSource: aiVerifications.taintSource,
          matchDetail: aiVerifications.matchDetail,
          likelyCwe: aiVerifications.likelyCwe,
          modelName: models.name,
        }).from(aiVerifications)
          .leftJoin(models, eq(aiVerifications.modelId, models.id))
          .where(inArray(aiVerifications.findingId, findingIds))
      : [];

    // Map AI data to findings (latest verification per finding)
    const aiMap = new Map<string, typeof aiData[number]>();
    for (const row of aiData) {
      if (!row.findingId) continue;
      const existing = aiMap.get(row.findingId);
      if (!existing) aiMap.set(row.findingId, row);
    }

    const enrichedData = data.map((row) => {
      const ai = row.id ? aiMap.get(row.id) : undefined;
      return {
        ...row,
        verdict: ai ? (ai.verdict === 'true_positive' ? 'TP' : ai.verdict === 'false_positive' ? 'FP' : 'Pending') : 'Pending',
        model: ai?.modelName ?? null,
        confidence: ai?.confidence ?? null,
        explanation: ai?.explanation ?? null,
        fixSuggestion: ai?.fixSuggestion ?? null,
        dataFlow: ai?.dataFlow ?? null,
        taintSource: ai?.taintSource ?? null,
        matchDetail: ai?.matchDetail ?? null,
        likelyCwe: ai?.likelyCwe ?? null,
      };
    });

    const [{ total }] = await executor.select({ total: count() }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .where(whereClause);

    return { data: enrichedData, total };
  },

  /**
   * List findings by scan ID.
   * When onlyNew=true, uses finding_group_scans.is_new (set by code diff comparison).
   */
  async listByScan(scanId: string, params: {
    page: number;
    perPage: number;
    status?: string;
    onlyNew?: boolean;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const offset = getOffset(params.page, params.perPage);

    const conditions = [eq(findings.scanId, scanId)];
    if (params.status) conditions.push(eq(findingGroups.status, params.status));

    // When onlyNew=true, filter to only groups marked as new by code diff
    if (params.onlyNew) {
      conditions.push(eq(findingGroupScans.isNew, true));
    }

    const whereClause = and(...conditions);

    const data = await executor.select({
      id: findings.id,
      scanId: findings.scanId,
      groupId: findings.groupId,
      cweId: findings.cweId,
      severity: findings.severity,
      groupStatus: findingGroups.status,
      filePath: findings.filePath,
      lineNumber: findings.lineNumber,
      description: findings.description,
      rule: findings.rule,
      scanner: findings.scanner,
      message: findings.message,
      assignedTo: findings.assignedTo,
      createdAt: findings.createdAt,
      firstSeenAt: findingGroups.firstSeenAt,
      repositoryName: repositories.name,
      isNew: findingGroupScans.isNew,
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(scans, eq(findings.scanId, scans.id))
      .leftJoin(repositories, eq(scans.repositoryId, repositories.id))
      .leftJoin(findingGroupScans, and(
        eq(findingGroupScans.groupId, findingGroups.id),
        eq(findingGroupScans.scanId, scanId),
      ))
      .where(whereClause)
      .orderBy(desc(findings.createdAt))
      .limit(params.perPage).offset(offset);

    // Fetch AI verifications separately to avoid LEFT JOIN duplicate rows
    const findingIds = data.map((r) => r.id);
    const aiData = findingIds.length > 0
      ? await executor.select({
          findingId: aiVerifications.findingId,
          verdict: aiVerifications.verdict,
          confidence: aiVerifications.confidence,
          modelName: models.name,
        }).from(aiVerifications)
          .leftJoin(models, eq(aiVerifications.modelId, models.id))
          .where(inArray(aiVerifications.findingId, findingIds))
      : [];

    const aiMap = new Map<string, typeof aiData[number]>();
    for (const row of aiData) {
      if (!row.findingId) continue;
      const existing = aiMap.get(row.findingId);
      if (!existing) aiMap.set(row.findingId, row);
    }

    const enrichedData = data.map((row) => {
      const ai = row.id ? aiMap.get(row.id) : undefined;
      return {
        ...row,
        verdict: ai ? (ai.verdict === 'true_positive' ? 'TP' : ai.verdict === 'false_positive' ? 'FP' : 'Pending') : 'Pending',
        model: ai?.modelName ?? null,
        confidence: ai?.confidence ?? null,
      };
    });

    const countConditions = [eq(findings.scanId, scanId)];
    if (params.status) countConditions.push(eq(findingGroups.status, params.status));
    if (params.onlyNew) {
      countConditions.push(eq(findingGroupScans.isNew, true));
    }
    const countWhere = and(...countConditions);

    const countQuery = executor.select({ total: count(sql`DISTINCT ${findingGroups.id}`) }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id));

    if (params.onlyNew) {
      countQuery.innerJoin(findingGroupScans, and(
        eq(findingGroupScans.groupId, findingGroups.id),
        eq(findingGroupScans.scanId, scanId),
      ));
    }

    const [{ total }] = await countQuery.where(countWhere);

    return { data: enrichedData, total };
  },

  /**
   * Get a finding by ID.
   */
  async findById(id: string, tx?: Tx) {
    const executor = tx ?? db;
    const [finding] = await executor.select().from(findings).where(eq(findings.id, id)).limit(1);
    return finding ?? null;
  },

  /**
   * Get a finding group by ID.
   */
  async findGroupById(id: string, tx?: Tx) {
    const executor = tx ?? db;
    const [group] = await executor.select().from(findingGroups).where(eq(findingGroups.id, id)).limit(1);
    return group ?? null;
  },

  /**
   * Update finding group status and record the change in finding history.
   * Operates on finding_groups, not findings.
   */
  async updateGroupStatus(groupId: string, status: string, userId: string | null, tx?: Tx) {
    const executor = tx ?? db;

    const [oldGroup] = await executor.select({ status: findingGroups.status })
      .from(findingGroups).where(eq(findingGroups.id, groupId)).limit(1);

    const [group] = await executor.update(findingGroups)
      .set({ status })
      .where(eq(findingGroups.id, groupId))
      .returning();

    if (group && oldGroup) {
      // Find first finding in this group to link history record (finding_history FK → findings.id)
      const [firstFinding] = await executor.select({ id: findings.id })
        .from(findings).where(eq(findings.groupId, groupId)).limit(1);
      
      if (firstFinding) {
        await executor.insert(findingHistory).values({
          findingId: firstFinding.id,
          field: 'group_status',
          oldValue: oldGroup.status,
          newValue: status,
          createdBy: userId,
        });
      }
    }

    return group;
  },

  /**
   * Bulk update finding group statuses.
   */
  async updateGroupsStatusBulk(groupIds: string[], status: string, tx?: Tx) {
    if (groupIds.length === 0) return;
    const executor = tx ?? db;
    await executor
      .update(findingGroups)
      .set({ status })
      .where(inArray(findingGroups.id, groupIds));
  },

  /**
   * Update finding assignee.
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
   */
  async getVerifications(findingId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt));
  },

  /**
   * Find an existing finding group by fingerprint or create a new one.
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
   * Also reopens groups with status 'resolved'.
   * Inserts into finding_group_scans for explicit new/pre-existing tracking.
   */
  async findOrCreateFindingGroups(
    projectId: string | null,
    repositoryId: string | null,
    entries: { fingerprint: string; title: string }[],
    scanId?: string,
    tx?: Tx,
  ): Promise<Map<string, { id: string; fingerprint: string; status: string; isNew: boolean }>> {
    if (entries.length === 0) return new Map();
    const executor = tx ?? db;

    // Insert new groups — ON CONFLICT DO NOTHING + RETURNING only returns actually inserted rows
    const inserted = await executor
      .insert(findingGroups)
      .values(entries.map((e) => ({
        projectId: projectId ?? null,
        repositoryId: repositoryId ?? null,
        fingerprint: e.fingerprint,
        title: e.title,
      })))
      .onConflictDoNothing()
      .returning({ fingerprint: findingGroups.fingerprint });

    const newFingerprints = new Set(inserted.map((r) => r.fingerprint));

    const fingerprints = entries.map((e) => e.fingerprint);
    const repoCondition = repositoryId
      ? eq(findingGroups.repositoryId, repositoryId)
      : isNull(findingGroups.repositoryId);
    const groups = await executor
      .select({ id: findingGroups.id, fingerprint: findingGroups.fingerprint, status: findingGroups.status })
      .from(findingGroups)
      .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));

    // Reopen groups that were resolved
    const groupsToReopen = groups
      .filter((g) => g.status === 'resolved')
      .map((g) => g.id);
    if (groupsToReopen.length > 0) {
      await executor
        .update(findingGroups)
        .set({ status: 'open', lastSeenAt: new Date() })
        .where(inArray(findingGroups.id, groupsToReopen));
    }

    // Update lastSeenAt for all groups
    if (groups.length > 0) {
      await executor
        .update(findingGroups)
        .set({ lastSeenAt: new Date() })
        .where(and(repoCondition, inArray(findingGroups.fingerprint, fingerprints)));
    }

    // Return updated status with isNew flag
    const updatedGroups = groups.map((g) => ({
      ...g,
      status: groupsToReopen.includes(g.id) ? 'open' : g.status,
      isNew: newFingerprints.has(g.fingerprint),
    }));

    // Insert into finding_group_scans for explicit tracking
    if (scanId && updatedGroups.length > 0) {
      await executor
        .insert(findingGroupScans)
        .values(updatedGroups.map((g) => ({
          scanId,
          groupId: g.id,
          isNew: g.isNew,
        })))
        .onConflictDoNothing();
    }

    return new Map(updatedGroups.map((g) => [g.fingerprint, g]));
  },

  /**
   * List open finding groups for a repository.
   */
  async listOpenGroupsByRepository(repositoryId: string, scanner?: string, tx?: Tx) {
    const executor = tx ?? db;
    const conditions = [
      eq(findingGroups.repositoryId, repositoryId),
      eq(findingGroups.status, 'open'),
    ];

    if (scanner) {
      conditions.push(eq(findings.scanner, scanner));
    }

    return executor
      .select({
        id: findingGroups.id,
        fingerprint: findingGroups.fingerprint,
        status: findingGroups.status,
        scanId: sql`MAX(${findings.scanId})`.as('scanId'),
      })
      .from(findingGroups)
      .innerJoin(findings, eq(findings.groupId, findingGroups.id))
      .where(and(...conditions))
      .groupBy(findingGroups.id, findingGroups.fingerprint, findingGroups.status);
  },

  /**
   * Count findings by severity for a project.
   * Uses finding_groups.status instead of findings.active.
   */
  async countBySeverity(projectId: string, tx?: Tx) {
    const executor = tx ?? db;
    return executor.select({
      severity: findings.severity,
      count: count(sql`DISTINCT ${findingGroups.id}`),
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findingGroups.projectId, projectId), eq(findingGroups.status, 'open')))
      .groupBy(findings.severity);
  },

  /**
   * Get the latest completed scan for a branch.
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
   * List findings on a specific branch (from latest completed scan).
   */
  async listByBranch(
    repositoryId: string,
    branch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    const executor = tx ?? db;
    const offset = getOffset(pagination.page, pagination.perPage);

    // Get latest completed scan ID for this branch
    const latestScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        eq(scans.branch, branch),
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    const conditions = [
      eq(findings.scanId, sql`(${latestScanId})`),
      eq(findingGroups.status, 'open'),
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
        groupStatus: findingGroups.status,
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
      .where(and(...conditions))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    const [{ total }] = await executor
      .select({ total: count() })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(...conditions));

    return { data, total };
  },

  /**
   * Find new findings on head branch that don't exist on base branch (PR diff).
   * Fingerprint comparison: find groups on head that don't exist on base.
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
    const offset = getOffset(pagination.page, pagination.perPage);

    // Note: repositoryId is enforced via subqueries, not in baseConditions
    const baseConditions = [
      eq(findingGroups.status, 'open'),
    ];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    // CI/CD PR scans store PR number in `branch` and actual branch in `head_branch`/`base_branch`
    // Head: match scans that scanned the head branch content (push scans OR PR scans from this branch)
    const headBranchMatch = or(eq(scans.branch, headBranch), eq(scans.headBranch, headBranch));
    // Base: only match push scans on the base branch (PR scans scan HEAD content, not BASE)
    const baseBranchMatch = eq(scans.branch, baseBranch);

    // Get latest completed scan ID for each branch to avoid counting across multiple scans
    const latestHeadScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        headBranchMatch,
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    const latestBaseScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        baseBranchMatch,
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    // Get fingerprints from base branch (latest scan only)
    const baseFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestBaseScanId})`),
        eq(findingGroups.status, 'open'),
      ));

    // Get findings on head branch (latest scan only) whose fingerprints are NOT on base
    const data = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        groupStatus: findingGroups.status,
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
      .where(and(
        eq(findings.scanId, sql`(${latestHeadScanId})`),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${baseFingerprints})`,
      ))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    // Fetch AI data separately to avoid LEFT JOIN duplicate rows
    const findingIds = data.map((r) => r.id);
    const aiData = findingIds.length > 0
      ? await executor.select({
          findingId: aiVerifications.findingId,
          verdict: aiVerifications.verdict,
          confidence: aiVerifications.confidence,
          modelName: models.name,
        }).from(aiVerifications)
          .leftJoin(models, eq(aiVerifications.modelId, models.id))
          .where(inArray(aiVerifications.findingId, findingIds))
      : [];

    const aiMap = new Map<string, typeof aiData[number]>();
    for (const row of aiData) {
      if (!row.findingId) continue;
      const existing = aiMap.get(row.findingId);
      if (!existing) aiMap.set(row.findingId, row);
    }

    const enrichedData = data.map((row) => {
      const ai = row.id ? aiMap.get(row.id) : undefined;
      return {
        ...row,
        aiVerdict: ai?.verdict ?? null,
        confidence: ai?.confidence ?? null,
      };
    });

    // Count unique groups (not finding rows — prevents N×M inflation)
    const [{ total }] = await executor
      .select({ total: count(sql`DISTINCT ${findingGroups.id}`) })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestHeadScanId})`),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${baseFingerprints})`,
      ));

    return { data: enrichedData, total };
  },

  /**
   * Find fixed findings on head branch (exist on base but not on head).
   * Fingerprint comparison: find groups on base that don't exist on head.
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
    const offset = getOffset(pagination.page, pagination.perPage);

    // Note: repositoryId is enforced via subqueries, not in baseConditions
    const baseConditions = [
      eq(findingGroups.status, 'open'),
    ];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    // CI/CD PR scans store PR number in `branch` and actual branch in `head_branch`/`base_branch`
    // Head: match scans that scanned the head branch content (push scans OR PR scans from this branch)
    const headBranchMatch = or(eq(scans.branch, headBranch), eq(scans.headBranch, headBranch));
    // Base: only match push scans on the base branch (PR scans scan HEAD content, not BASE)
    const baseBranchMatch = eq(scans.branch, baseBranch);

    // Get latest completed scan ID for each branch to avoid counting across multiple scans
    const latestHeadScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        headBranchMatch,
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    const latestBaseScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        baseBranchMatch,
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    // Get fingerprints from head branch (latest scan only)
    const headFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestHeadScanId})`),
        eq(findingGroups.status, 'open'),
      ));

    // Get findings on base branch (latest scan only) whose fingerprints are NOT on head
    const data = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        groupStatus: findingGroups.status,
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
      .where(and(
        eq(findings.scanId, sql`(${latestBaseScanId})`),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${headFingerprints})`,
      ))
      .orderBy(desc(findings.createdAt))
      .limit(pagination.perPage)
      .offset(offset);

    // Count unique groups (not finding rows — prevents N×M inflation)
    const [{ total }] = await executor
      .select({ total: count(sql`DISTINCT ${findingGroups.id}`) })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestBaseScanId})`),
        ...baseConditions,
        sql`${findingGroups.fingerprint} NOT IN (${headFingerprints})`,
      ));

    return { data, total };
  },

  /**
   * Find fixed findings by comparing two scans on the SAME branch.
   * Used for inline comment resolve: find fingerprints that were in previousScan
   * but are NOT in currentScan.
   *
   * @param repositoryId - Repository UUID
   * @param branch - Branch name (head branch of PR)
   * @param currentScanId - Current scan UUID (latest)
   * @param previousScanId - Previous scan UUID
   * @returns Array of fingerprints that were fixed (in previous but not in current)
   */
  async diffFixedFindingsByBranch(
    repositoryId: string,
    branch: string,
    currentScanId: string,
    previousScanId: string,
    tx?: Tx,
  ): Promise<string[]> {
    const executor = tx ?? db;

    // Get fingerprints from current scan
    const currentFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, currentScanId),
        eq(findingGroups.status, 'open'),
      ));

    // Find groups that were in previous scan but NOT in current scan
    const fixedGroups = await executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, previousScanId),
        eq(findingGroups.status, 'open'),
        sql`${findingGroups.fingerprint} NOT IN (${currentFingerprints})`,
      ));

    // Deduplicate by fingerprint
    const fingerprints = [...new Set(fixedGroups.map((g) => g.fingerprint))];
    return fingerprints;
  },

  /**
   * Get the previous scan ID for a branch (scan before the given scanId).
   */
  async getPreviousScanId(
    repositoryId: string,
    branch: string,
    currentScanId: string,
    tx?: Tx,
  ): Promise<string | null> {
    const executor = tx ?? db;

    const branchMatch = or(eq(scans.branch, branch), eq(scans.headBranch, branch));

    const [previousScan] = await executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        branchMatch,
        eq(scans.status, 'completed'),
        sql`${scans.id} != ${currentScanId}`,
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    return previousScan?.id ?? null;
  },

  /**
   * Count distinct finding groups on a branch (for computing persistent/pre-existing findings).
   */
  async countGroupsByBranch(
    repositoryId: string,
    branch: string,
    tx?: Tx,
  ): Promise<number> {
    const executor = tx ?? db;

    // Match push scans on this branch (same logic as diffNewFindings base/head queries)
    const branchMatch = or(eq(scans.branch, branch), eq(scans.headBranch, branch));

    // Get latest completed scan ID for this branch
    const latestScanId = executor
      .select({ id: scans.id })
      .from(scans)
      .where(and(
        eq(scans.repositoryId, repositoryId),
        branchMatch,
        eq(scans.status, 'completed'),
      ))
      .orderBy(desc(scans.createdAt))
      .limit(1);

    const [{ total }] = await executor
      .select({ total: count(sql`DISTINCT ${findingGroups.id}`) })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestScanId})`),
        eq(findingGroups.status, 'open'),
      ));

    return Number(total) || 0;
  },

  /**
   * Find new findings by comparing scan findings against code diff (git diff).
   * A finding is "new" if it's on a file and line that was changed in the PR.
   *
   * @param scanId - Scan UUID (head branch scan)
   * @param changedFiles - Files changed in the PR with line-level diff info
   * @returns Findings that are on changed lines (NEW findings)
   */
  async diffNewFindingsByCodeDiff(
    scanId: string,
    changedFiles: ChangedFile[],
    tx?: Tx,
  ) {
    const executor = tx ?? db;

    if (changedFiles.length === 0) {
      logger.scan.info('diffNewFindingsByCodeDiff: no changed files, returning empty', { scanId });
      return { data: [], total: 0 };
    }

    // Build a map of normalizedFilePath → Set<changedLine> for fast lookup
    const changedLinesMap = new Map<string, Set<number>>();
    for (const file of changedFiles) {
      changedLinesMap.set(stripDockerPrefix(file.filePath), new Set(file.changedLines));
    }

    logger.scan.info('diffNewFindingsByCodeDiff: changedLinesMap built', {
      scanId,
      totalFiles: changedFiles.length,
      normalizedPaths: Array.from(changedLinesMap.keys()).slice(0, 10),
    });

    // Get all findings for this scan
    const allFindings = await executor
      .select({
        id: findings.id,
        scanId: findings.scanId,
        groupId: findings.groupId,
        fingerprint: findingGroups.fingerprint,
        cweId: findings.cweId,
        severity: findings.severity,
        groupStatus: findingGroups.status,
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
      .where(and(
        eq(findings.scanId, scanId),
        eq(findingGroups.status, 'open'),
      ));

    // Filter: only include findings on changed lines (normalize paths for comparison)
    const newFindings = allFindings.filter((f) => {
      if (!f.filePath || !f.lineNumber) return false;
      const changedLines = changedLinesMap.get(stripDockerPrefix(f.filePath));
      if (!changedLines) return false;
      return changedLines.has(f.lineNumber);
    });

    logger.scan.info('diffNewFindingsByCodeDiff: filtering results', {
      scanId,
      totalFindings: allFindings.length,
      matchedFindings: newFindings.length,
      sampleFilePaths: allFindings.slice(0, 5).map(f => f.filePath),
      sampleNormalized: allFindings.slice(0, 5).map(f => stripDockerPrefix(f.filePath ?? '')),
    });

    // Fetch AI data separately
    const findingIds = newFindings.map((r) => r.id);
    const aiData = findingIds.length > 0
      ? await executor.select({
          findingId: aiVerifications.findingId,
          verdict: aiVerifications.verdict,
          confidence: aiVerifications.confidence,
          modelName: models.name,
        }).from(aiVerifications)
          .leftJoin(models, eq(aiVerifications.modelId, models.id))
          .where(inArray(aiVerifications.findingId, findingIds))
      : [];

    const aiMap = new Map<string, typeof aiData[number]>();
    for (const row of aiData) {
      if (!row.findingId) continue;
      const existing = aiMap.get(row.findingId);
      if (!existing) aiMap.set(row.findingId, row);
    }

    const enrichedData = newFindings.map((row) => {
      const ai = row.id ? aiMap.get(row.id) : undefined;
      return {
        ...row,
        aiVerdict: ai?.verdict ?? null,
        confidence: ai?.confidence ?? null,
      };
    });

    return { data: enrichedData, total: enrichedData.length };
  },

  /**
   * Update finding_group_scans.isNew flags based on code diff comparison.
   * Sets isNew=true for findings on changed lines, false for unchanged.
   */
  async updateIsNewByCodeDiff(
    scanId: string,
    changedFiles: ChangedFile[],
    tx?: Tx,
  ): Promise<void> {
    const executor = tx ?? db;

    if (changedFiles.length === 0) {
      // No diff info — mark all as not new
      await executor
        .update(findingGroupScans)
        .set({ isNew: false })
        .where(eq(findingGroupScans.scanId, scanId));
      return;
    }

    // Build a map of normalizedFilePath → Set<changedLine>
    const changedLinesMap = new Map<string, Set<number>>();
    for (const file of changedFiles) {
      changedLinesMap.set(stripDockerPrefix(file.filePath), new Set(file.changedLines));
    }

    // Get all groups for this scan with their finding file/line info
    const groups = await executor
      .select({
        groupId: findingGroupScans.groupId,
        filePath: findings.filePath,
        lineNumber: findings.lineNumber,
      })
      .from(findingGroupScans)
      .innerJoin(findings, and(
        eq(findings.groupId, findingGroupScans.groupId),
        eq(findings.scanId, findingGroupScans.scanId),
      ))
      .where(eq(findingGroupScans.scanId, scanId));

    // Deduplicate by groupId (a group may have multiple findings)
    const groupIsNew = new Map<string, boolean>();
    for (const g of groups) {
      if (groupIsNew.has(g.groupId)) continue; // already determined
      if (!g.filePath || !g.lineNumber) {
        groupIsNew.set(g.groupId, false);
        continue;
      }
      const changedLines = changedLinesMap.get(stripDockerPrefix(g.filePath));
      groupIsNew.set(g.groupId, changedLines ? changedLines.has(g.lineNumber) : false);
    }

    // Update each group's isNew flag
    let newCount = 0;
    let preExistingCount = 0;
    for (const [groupId, isNew] of groupIsNew) {
      if (isNew) newCount++;
      else preExistingCount++;

      await executor
        .update(findingGroupScans)
        .set({ isNew })
        .where(and(
          eq(findingGroupScans.scanId, scanId),
          eq(findingGroupScans.groupId, groupId),
        ));
    }

    logger.scan.info('updateIsNewByCodeDiff: completed', {
      scanId,
      totalGroups: groupIsNew.size,
      newGroups: newCount,
      preExistingGroups: preExistingCount,
    });
  },
};

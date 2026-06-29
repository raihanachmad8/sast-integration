import { eq, and, desc, count, sql } from 'drizzle-orm';
import { type InferInsertModel } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { findings, findingGroups, aiVerifications } from '@drizzle/schema/findings';
import { scans } from '@drizzle/schema/scans';

import { findingDiffRepository } from './finding-diff.repository';
import { findingGroupRepository } from './finding-group.repository';
import {
  listFindingsByScan,
  listFindingsByProject,
  listFindingsByWorkspace,
  listAccessibleFindings,
  fetchAiEnrichmentBatch,
} from './finding-query.repository';


export const findingRepository = {
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
    logger.finding.info('createMany', { count: findingsData.length });
    const executor = tx ?? db;
    if (findingsData.length === 0) return [];
    return executor.insert(findings).values(findingsData).returning();
  },

  async create(
    data: Omit<InferInsertModel<typeof findings>, 'id' | 'createdAt' | 'updatedAt'>,
    tx?: Tx,
  ) {
    logger.finding.info('create', { scanId: data.scanId });
    const executor = tx ?? db;
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== null),
    ) as unknown as InferInsertModel<typeof findings>;
    const [finding] = await executor.insert(findings).values(cleaned).returning();
    return finding;
  },

  async findById(id: string, tx?: Tx) {
    logger.finding.info('findById', { id });
    const executor = tx ?? db;
    const [finding] = await executor.select().from(findings).where(eq(findings.id, id)).limit(1);
    return finding ?? null;
  },

  async updateAssignment(id: string, assigneeId: string | null, tx?: Tx) {
    logger.finding.info('updateAssignment', { id, assigneeId });
    const executor = tx ?? db;
    const [finding] = await executor.update(findings)
      .set({ assignedTo: assigneeId, updatedAt: new Date() })
      .where(eq(findings.id, id))
      .returning();
    return finding;
  },

  async getVerifications(findingId: string, tx?: Tx) {
    logger.finding.info('getVerifications', { findingId });
    const executor = tx ?? db;
    return executor.select().from(aiVerifications)
      .where(eq(aiVerifications.findingId, findingId))
      .orderBy(desc(aiVerifications.createdAt));
  },

  async countBySeverity(projectId: string, tx?: Tx) {
    logger.finding.info('countBySeverity', { projectId });
    const executor = tx ?? db;
    return executor.select({
      severity: findings.severity,
      count: count(sql`DISTINCT ${findingGroups.id}`),
    }).from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(eq(findingGroups.projectId, projectId), eq(findingGroups.status, 'open')))
      .groupBy(findings.severity);
  },

  async findLatestScanByBranch(repositoryId: string, branch: string, tx?: Tx) {
    logger.finding.info('findLatestScanByBranch', { repositoryId, branch });
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

  async listByBranch(
    repositoryId: string,
    branch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    logger.finding.info('listByBranch', { repositoryId, branch });
    const executor = tx ?? db;
    const offset = (pagination.page - 1) * pagination.perPage;

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

  listByProject: listFindingsByProject,
  listByWorkspace: listFindingsByWorkspace,
  listAccessible: listAccessibleFindings,
  listByScan: listFindingsByScan,

  findGroupById: findingGroupRepository.findGroupById,
  updateGroupStatus: findingGroupRepository.updateGroupStatus,
  updateGroupsStatusBulk: findingGroupRepository.updateGroupsStatusBulk,
  findOrCreateFindingGroup: findingGroupRepository.findOrCreateFindingGroup,
  findOrCreateFindingGroups: findingGroupRepository.findOrCreateFindingGroups,
  listOpenGroupsByRepository: findingGroupRepository.listOpenGroupsByRepository,
  countGroupsByStatusForScan: findingGroupRepository.countGroupsByStatusForScan,
  countGroupsByBranch: findingGroupRepository.countGroupsByBranch,

  diffNewFindings: findingDiffRepository.diffNewFindings,
  diffFixedFindings: findingDiffRepository.diffFixedFindings,
  diffFixedFindingsByBranch: findingDiffRepository.diffFixedFindingsByBranch,
  getPreviousScanId: findingDiffRepository.getPreviousScanId,
  diffNewFindingsByCodeDiff: findingDiffRepository.diffNewFindingsByCodeDiff,
  updateIsNewByCodeDiff: findingDiffRepository.updateIsNewByCodeDiff,

  fetchAiEnrichmentBatch,
};

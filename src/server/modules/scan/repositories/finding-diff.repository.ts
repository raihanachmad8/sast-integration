import { eq, and, or, desc, count, sql, inArray } from 'drizzle-orm';

import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import type { ChangedFile } from '@/server/modules/source-control/scm-api.service';
import { findings, findingGroups, aiVerifications, findingGroupScans } from '@drizzle/schema/findings';
import { models } from '@drizzle/schema/integrations';
import { scans } from '@drizzle/schema/scans';

function stripDockerPrefix(filePath: string): string {
  const match = filePath.match(/^\/workspace\/[^/]+\/[^/]+\/(.+)$/);
  return match ? match[1] : filePath;
}

const DIFF_SELECT_SHAPE = {
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
};

export const findingDiffRepository = {
  async diffNewFindings(
    repositoryId: string,
    headBranch: string,
    baseBranch: string,
    filters: { scanner?: string; severity?: string },
    pagination: { page: number; perPage: number },
    tx?: Tx,
  ) {
    logger.scan.debug('diffNewFindings', { repositoryId, headBranch, baseBranch });
    const executor = tx ?? db;
    const offset = (pagination.page - 1) * pagination.perPage;

    const baseConditions = [eq(findingGroups.status, 'open')];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    const headBranchMatch = or(eq(scans.branch, headBranch), eq(scans.headBranch, headBranch));
    const baseBranchMatch = eq(scans.branch, baseBranch);

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

    const baseFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestBaseScanId})`),
        eq(findingGroups.status, 'open'),
      ));

    const data = await executor
      .select(DIFF_SELECT_SHAPE)
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

    const baseConditions = [eq(findingGroups.status, 'open')];
    if (filters.scanner) baseConditions.push(eq(findings.scanner, filters.scanner));
    if (filters.severity) baseConditions.push(eq(findings.severity, filters.severity));

    const headBranchMatch = or(eq(scans.branch, headBranch), eq(scans.headBranch, headBranch));
    const baseBranchMatch = eq(scans.branch, baseBranch);

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

    const headFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, sql`(${latestHeadScanId})`),
        eq(findingGroups.status, 'open'),
      ));

    const data = await executor
      .select(DIFF_SELECT_SHAPE)
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

  async diffFixedFindingsByBranch(
    repositoryId: string,
    branch: string,
    currentScanId: string,
    previousScanId: string,
    tx?: Tx,
  ): Promise<string[]> {
    const executor = tx ?? db;

    const currentFingerprints = executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(eq(findings.scanId, currentScanId));

    const fixedGroups = await executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, previousScanId),
        sql`${findingGroups.fingerprint} NOT IN (${currentFingerprints})`,
      ));

    const resolvedGroups = await executor
      .select({ fingerprint: findingGroups.fingerprint })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, currentScanId),
        eq(findingGroups.status, 'resolved'),
      ));

    const fingerprints = [
      ...new Set([
        ...fixedGroups.map((g) => g.fingerprint),
        ...resolvedGroups.map((g) => g.fingerprint),
      ]),
    ];
    return fingerprints;
  },

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

    const changedLinesMap = new Map<string, Set<number>>();
    for (const file of changedFiles) {
      changedLinesMap.set(stripDockerPrefix(file.filePath), new Set(file.changedLines));
    }

    logger.scan.info('diffNewFindingsByCodeDiff: changedLinesMap built', {
      scanId,
      totalFiles: changedFiles.length,
      normalizedPaths: Array.from(changedLinesMap.keys()).slice(0, 10),
    });

    const allFindings = await executor
      .select(DIFF_SELECT_SHAPE)
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .where(and(
        eq(findings.scanId, scanId),
        sql`${findingGroups.status} != 'resolved'`,
      ));

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

  async updateIsNewByCodeDiff(
    scanId: string,
    changedFiles: ChangedFile[],
    tx?: Tx,
  ): Promise<void> {
    const executor = tx ?? db;

    if (changedFiles.length === 0) {
      await executor
        .update(findingGroupScans)
        .set({ isNew: false })
        .where(eq(findingGroupScans.scanId, scanId));
      return;
    }

    const changedLinesMap = new Map<string, Set<number>>();
    for (const file of changedFiles) {
      changedLinesMap.set(stripDockerPrefix(file.filePath), new Set(file.changedLines));
    }

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

    const groupIsNew = new Map<string, boolean>();
    for (const g of groups) {
      if (groupIsNew.has(g.groupId)) continue;
      if (!g.filePath || !g.lineNumber) {
        groupIsNew.set(g.groupId, false);
        continue;
      }
      const changedLines = changedLinesMap.get(stripDockerPrefix(g.filePath));
      groupIsNew.set(g.groupId, changedLines ? changedLines.has(g.lineNumber) : false);
    }

    let newCount = 0;
    let preExistingCount = 0;
    const updatePromises: Promise<unknown>[] = [];
    for (const [groupId, isNew] of groupIsNew) {
      if (isNew) newCount++;
      else preExistingCount++;

      updatePromises.push(
        executor
          .update(findingGroupScans)
          .set({ isNew })
          .where(and(
            eq(findingGroupScans.scanId, scanId),
            eq(findingGroupScans.groupId, groupId),
          ))
      );
    }
    await Promise.all(updatePromises);

    logger.scan.info('updateIsNewByCodeDiff: completed', {
      scanId,
      totalGroups: groupIsNew.size,
      newGroups: newCount,
      preExistingGroups: preExistingCount,
    });
  },
};

import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups, aiVerifications } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans as scansTable } from '@drizzle/schema/scans';
import { models } from '@drizzle/schema/integrations';
import { repositories } from '@drizzle/schema/source-controls';
export const dashboardRepository = {
  /**
   * Get aggregated dashboard statistics for a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Stats object with connectedRepos, activeScans, criticalFindings, and awaitingAi counts
   */
  async getStats(workspaceId: string) {
    const _projectIds = db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));

    const [
      connectedReposResult,
      activeScansResult,
      criticalFindingsResult,
      awaitingAiResult,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(repositories)
        .where(and(eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(scansTable)
        .innerJoin(repositories, eq(scansTable.repositoryId, repositories.id))
        .where(and(eq(repositories.workspaceId, workspaceId), eq(scansTable.status, 'running'))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt), eq(findings.severity, 'critical'), eq(findingGroups.status, 'open'))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .leftJoin(aiVerifications, eq(findings.id, aiVerifications.findingId))
        .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt), isNull(aiVerifications.id))),
    ]);

    return {
      connectedRepos: Number(connectedReposResult[0]?.count ?? 0),
      activeScans: Number(activeScansResult[0]?.count ?? 0),
      criticalFindings: Number(criticalFindingsResult[0]?.count ?? 0),
      awaitingAi: Number(awaitingAiResult[0]?.count ?? 0),
    };
  },

  /**
   * Get recent scans for a workspace with human-readable time strings.
   * @param workspaceId - Workspace UUID
   * @param limit - Maximum number of scans to return (default: 10)
   * @returns Array of scan records with repository name, branch, status, and relative time
   */
  async getRecentScans(workspaceId: string, limit = 10) {
    const scans = await db
      .select({
        id: scansTable.id,
        repository: repositories.name,
        branch: scansTable.branch,
        status: scansTable.status,
        stage: scansTable.status,
        createdAt: scansTable.createdAt,
        completedAt: scansTable.completedAt,
      })
      .from(scansTable)
      .innerJoin(repositories, eq(scansTable.repositoryId, repositories.id))
      .where(and(eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt)))
      .orderBy(desc(scansTable.createdAt))
      .limit(limit);

    return scans.map((scan) => ({
      ...scan,
      time: scan.completedAt
        ? `${Math.floor((Date.now() - new Date(scan.completedAt).getTime()) / 60000)} min ago`
        : `${Math.floor((Date.now() - new Date(scan.createdAt).getTime()) / 60000)} min ago`,
    }));
  },

  /**
   * Get a summary of the 10 most recent critical findings for a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Array of critical findings with rule, file path, severity, and AI verdict
   */
  async getFindingsSummary(workspaceId: string) {
    return db
      .select({
        id: findings.id,
        rule: findings.rule,
        file: findings.filePath,
        severity: findings.severity,
        verdict: aiVerifications.verdict,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .leftJoin(aiVerifications, eq(findings.id, aiVerifications.findingId))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt), eq(findings.severity, 'critical')))
      .orderBy(desc(findings.createdAt))
      .limit(10);
  },

  /**
   * Get health status showing counts of connected sources and configured AI models.
   * @param workspaceId - Workspace UUID
   * @returns Health object with scanners (always 0), sources, and models counts
   */
  async getHealthStatus(workspaceId: string) {
    const [sourceCount, modelCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(repositories).where(and(eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt))),
      db.select({ count: sql<number>`count(*)` }).from(models).where(eq(models.workspaceId, workspaceId)),
    ]);

    return {
      scanners: 0,
      sources: Number(sourceCount[0]?.count ?? 0),
      models: Number(modelCount[0]?.count ?? 0),
    };
  },
};

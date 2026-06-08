import { eq, desc, sql, and } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { models } from '@drizzle/schema/integrations';

export const dashboardRepository = {
  async getStats(workspaceId: string) {
    const _projectIds = db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.workspace_id, workspaceId));

    const [
      totalFindingsResult,
      findingsByStatusResult,
      totalScansResult,
      totalProjectsResult,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.project_id, projects.id))
        .where(eq(projects.workspace_id, workspaceId)),
      db
        .select({
          status: findings.status,
          count: sql<number>`count(*)`,
        })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.project_id, projects.id))
        .where(eq(projects.workspace_id, workspaceId))
        .groupBy(findings.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(scans)
        .innerJoin(projects, eq(scans.repository_id, projects.id))
        .where(eq(projects.workspace_id, workspaceId)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(eq(projects.workspace_id, workspaceId)),
    ]);

    return {
      totalFindings: Number(totalFindingsResult[0]?.count ?? 0),
      findingsByStatus: findingsByStatusResult.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      totalScans: Number(totalScansResult[0]?.count ?? 0),
      totalProjects: Number(totalProjectsResult[0]?.count ?? 0),
    };
  },

  async getRecentScans(workspaceId: string, limit = 10) {
    return db
      .select({
        id: scans.id,
        status: scans.status,
        branch: scans.branch,
        commit_sha: scans.commit_sha,
        origin: scans.origin,
        trigger_source: scans.trigger_source,
        started_at: scans.started_at,
        completed_at: scans.completed_at,
        created_at: scans.created_at,
      })
      .from(scans)
      .innerJoin(projects, eq(scans.repository_id, projects.id))
      .where(eq(projects.workspace_id, workspaceId))
      .orderBy(desc(scans.created_at))
      .limit(limit);
  },

  async getFindingsSummary(workspaceId: string) {
    const results = await db
      .select({
        severity: findings.severity,
        count: sql<number>`count(*)`,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.group_id, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.project_id, projects.id))
      .where(eq(projects.workspace_id, workspaceId))
      .groupBy(findings.severity);

    return results.map((row) => ({
      severity: row.severity,
      count: Number(row.count),
    }));
  },

  async getHealthStatus(workspaceId: string) {
    const [activeModelsResult, recentScanResult] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(models)
        .where(and(
          eq(models.workspace_id, workspaceId),
          eq(models.status, 'healthy'),
        )),
      db
        .select({
          id: scans.id,
          status: scans.status,
          completed_at: scans.completed_at,
        })
        .from(scans)
        .innerJoin(projects, eq(scans.repository_id, projects.id))
        .where(eq(projects.workspace_id, workspaceId))
        .orderBy(desc(scans.created_at))
        .limit(1),
    ]);

    return {
      activeModels: Number(activeModelsResult[0]?.count ?? 0),
      lastScan: recentScanResult[0] ?? null,
    };
  },
};

import { eq, desc, sql, and, isNull } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { findings, findingGroups } from '@drizzle/schema/findings';
import { projects } from '@drizzle/schema/projects';
import { scans } from '@drizzle/schema/scans';
import { models } from '@drizzle/schema/integrations';
import { repositories } from '@drizzle/schema/source-controls';

export const dashboardRepository = {
  async getStats(workspaceId: string) {
    const _projectIds = db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));

    const [
      totalFindingsResult,
      findingsByStatusResult,
      totalScansResult,
      totalProjectsResult,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt))),
      db
        .select({
          status: findings.status,
          count: sql<number>`count(*)`,
        })
        .from(findings)
        .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
        .innerJoin(projects, eq(findingGroups.projectId, projects.id))
        .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
        .groupBy(findings.status),
      db
        .select({ count: sql<number>`count(*)` })
        .from(scans)
        .innerJoin(repositories, eq(scans.repositoryId, repositories.id))
        .where(and(eq(repositories.workspaceId, workspaceId), isNull(repositories.deletedAt))),
      db
        .select({ count: sql<number>`count(*)` })
        .from(projects)
        .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt))),
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
        commitSha: scans.commitSha,
        origin: scans.origin,
        triggerSource: scans.triggerSource,
        startedAt: scans.startedAt,
        completedAt: scans.completedAt,
        createdAt: scans.createdAt,
      })
      .from(scans)
      .innerJoin(projects, eq(scans.repositoryId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
      .orderBy(desc(scans.createdAt))
      .limit(limit);
  },

  async getFindingsSummary(workspaceId: string) {
    const results = await db
      .select({
        severity: findings.severity,
        count: sql<number>`count(*)`,
      })
      .from(findings)
      .innerJoin(findingGroups, eq(findings.groupId, findingGroups.id))
      .innerJoin(projects, eq(findingGroups.projectId, projects.id))
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)))
      .groupBy(findings.severity);

    return results.map((row) => ({
      severity: row.severity,
      count: Number(row.count),
    }));
  },

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

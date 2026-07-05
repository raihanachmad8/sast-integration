import { eq, and, or, isNull, inArray, sql, asc, desc, count } from 'drizzle-orm';

import type { ProjectListQuery } from '@/commons/schemas/project.schema';
import type { ProjectMemberSummary, ProjectTeamSummary, ProjectRepositorySummary } from '@/commons/types/domain';
import { db, type Tx } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { projects, projectMembers, projectTeams } from '@drizzle/schema/projects';
import { repositories } from '@drizzle/schema/source-controls';
import { sourceControlImports, sourceControls } from '@drizzle/schema/source-controls';
import { teams, teamMembers } from '@drizzle/schema/teams';
import { users } from '@drizzle/schema/users';

export type UpdateProjectData = {
  name?: string;
  slug?: string;
  description?: string;
  lead?: string;
};

export const projectRepository = {
  /** List all projects for a workspace (with soft delete filter) */
  async listAll(workspaceId: string) {
    logger.project.info('listByWorkspace', { workspaceId });
    const rows = await db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));
    logger.project.info('listByWorkspace completed', { workspaceId, count: rows.length });
    return rows;
  },

  /**
   * List projects with DB-level search, sort, and pagination.
   * Uses shared query helpers for search and pagination meta.
   * Subquery-based sorts (repositories/teams/members count) handled inline.
   */
  async list(workspaceId: string, params?: ProjectListQuery) {
    logger.project.info('list', { workspaceId });
    const conditions = [
      eq(projects.workspaceId, workspaceId),
      isNull(projects.deletedAt),
    ];

    // Search (name, description)
    conditions.push(...buildSearch(params?.search, projects.name, projects.description));

    // Repository filter: project must have this repository
    if (params?.repository) {
      conditions.push(
        sql`${projects.id} IN (SELECT ${repositories.projectId} FROM ${repositories} WHERE ${repositories.id} = ${params.repository} AND ${repositories.deletedAt} IS NULL)`
      );
    }

    // Team filter: project must have this team
    if (params?.team) {
      conditions.push(
        sql`${projects.id} IN (SELECT ${projectTeams.projectId} FROM ${projectTeams} WHERE ${projectTeams.teamId} = ${params.team})`
      );
    }

    // Member filter: project must have this member
    if (params?.member) {
      conditions.push(
        sql`${projects.id} IN (SELECT ${projectMembers.projectId} FROM ${projectMembers} WHERE ${projectMembers.userId} = ${params.member})`
      );
    }

    // Count total
    const [{ count: total }] = await db
      .select({ count: count() })
      .from(projects)
      .where(and(...conditions));

    // Sort — subquery counts for relation columns, fallback to createdAt
    const orderFn = params?.order === 'asc' ? asc : desc;
    let sortExpr;
    switch (params?.sort) {
      case 'name':
        sortExpr = orderFn(projects.name);
        break;
      case 'createdAt':
        sortExpr = orderFn(projects.createdAt);
        break;
      case 'repositories':
        sortExpr = orderFn(sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${repositories} r WHERE r.project_id = ${projects.id} AND r.deleted_at IS NULL), 0)`);
        break;
      case 'teams':
        sortExpr = orderFn(sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${projectTeams} pt WHERE pt.project_id = ${projects.id}), 0)`);
        break;
      case 'members':
        sortExpr = orderFn(sql<number>`COALESCE((SELECT COUNT(*)::int FROM ${projectMembers} pm WHERE pm.project_id = ${projects.id}), 0)`);
        break;
      default:
        sortExpr = orderFn(projects.createdAt);
    }

    // Paginate
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;

    const data = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.project.info('list completed', { workspaceId, count: data.length, total });
    return { data, ...buildPaginationMeta(total, page, perPage) };
  },

  /** Find project by ID */
  async findById(id: string) {
    logger.project.info('findById', { id });
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);
    if (!project) {
      logger.project.warn('findById: project not found', { id });
    }
    return project ?? null;
  },

  /** Find a repository by ID and ensure it belongs to the given workspace */
  async findRepositoryByIdAndWorkspace(repositoryId: string, workspaceId: string) {
    logger.project.info('findRepositoryByIdAndWorkspace', { repositoryId, workspaceId });
    const [result] = await db
      .select({
        repository: repositories,
        project: projects,
      })
      .from(repositories)
      .leftJoin(projects, eq(projects.id, repositories.projectId))
      .where(and(
        eq(repositories.id, repositoryId),
        eq(repositories.workspaceId, workspaceId),
        isNull(repositories.deletedAt)
      ))
      .limit(1);

    if (!result) {
      logger.project.warn('findRepositoryByIdAndWorkspace: not found', { repositoryId, workspaceId });
    }
    return result ?? null;
  },

  /** Get the workspaceId that owns a given repository */
  async getWorkspaceIdByRepositoryId(repositoryId: string) {
    logger.project.info('getWorkspaceIdByRepositoryId', { repositoryId });
    const [result] = await db
      .select({
        workspaceId: projects.workspaceId,
      })
      .from(repositories)
      .innerJoin(projects, eq(projects.id, repositories.projectId))
      .where(and(
        eq(repositories.id, repositoryId),
        isNull(repositories.deletedAt)
      ))
      .limit(1);

    return result?.workspaceId ?? null;
  },

  /** Find project by slug within a workspace */
  async findBySlug(workspaceId: string, slug: string, tx?: Tx) {
    logger.project.info('findBySlug', { workspaceId, slug });
    const executor = tx ?? db;
    const [project] = await executor
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug), isNull(projects.deletedAt)))
      .limit(1);
    if (!project) {
      logger.project.warn('findBySlug: project not found', { workspaceId, slug });
    }
    return project ?? null;
  },

  /** Create a new project */
  async create(data: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
    createdBy: string;
  }, tx?: Tx) {
    logger.project.info('create', { workspaceId: data.workspaceId, name: data.name, slug: data.slug });
    const executor = tx ?? db;
    const [project] = await executor
      .insert(projects)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    logger.project.info('create completed', { projectId: project.id, name: data.name });
    return project;
  },

  /** Update project */
  async update(id: string, data: Record<string, unknown>) {
    logger.project.info('update', { id });
    const [project] = await db
      .update(projects)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    logger.project.info('update completed', { id });
    return project;
  },

  /** Soft delete project */
  async softDelete(id: string, deletedBy: string) {
    logger.project.info('softDelete', { id, deletedBy });
    const [project] = await db
      .update(projects)
      .set({
        deletedAt: new Date(),
        deletedBy: deletedBy,
      })
      .where(eq(projects.id, id))
      .returning();
    logger.project.info('softDelete completed', { id });
    return project;
  },

  /** List repositories belonging to this project */
  async listRepositories(projectId: string) {
    logger.project.info('listRepositories', { projectId });
    const rows = await db
      .select()
      .from(repositories)
      .where(and(eq(repositories.projectId, projectId), isNull(repositories.deletedAt)));
    logger.project.info('listRepositories completed', { projectId, count: rows.length });
    return rows;
  },

  /** List all repositories across all projects in a workspace (discovered + imported) */
  async listRepositoriesByWorkspace(
    workspaceId: string,
    filterMode?: 'imported' | 'manual',
    accessibleProjectIds?: string[],
    params?: { page?: number; perPage?: number; search?: string; sort?: string; order?: string },
  ) {
    logger.project.info('listRepositoriesByWorkspace', { workspaceId });
    const conditions = [
      eq(repositories.workspaceId, workspaceId),
      isNull(repositories.deletedAt),
      ...buildSearch(params?.search, repositories.name),
    ];
    if (filterMode) {
      conditions.push(eq(repositories.importMode, filterMode));
    }

    // Project-scoped filter: null projectId repos visible to all, others only if in accessibleProjectIds
    if (accessibleProjectIds) {
      conditions.push(
        or(
          isNull(repositories.projectId),
          inArray(repositories.projectId, accessibleProjectIds),
        )!,
      );
    }

    // Count total
    const [{ total }] = await db
      .select({ total: count() })
      .from(repositories)
      .where(and(...conditions));

    // Sort
    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: repositories.name, url: repositories.url, defaultBranch: repositories.defaultBranch, createdAt: repositories.createdAt },
      repositories.createdAt,
    );

    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;
    const offset = (page - 1) * perPage;

    const rows = await db
      .select({
        id: repositories.id,
        name: repositories.name,
        url: repositories.url,
        defaultBranch: repositories.defaultBranch,
        connectionType: repositories.connectionType,
        importMode: repositories.importMode,
        projectId: repositories.projectId,
        projectName: projects.name,
        provider: sql<string | null>`COALESCE(${repositories.provider}, ${sourceControls.provider})`,
        providerName: sourceControls.name,
        createdAt: repositories.createdAt,
        lastSyncedAt: repositories.lastSyncedAt,
        scanCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM scans s WHERE s.repository_id = ${repositories.id}), 0)`,
        findingCount: sql<number>`COALESCE((SELECT COUNT(*)::int FROM findings f JOIN scans s ON f.scan_id = s.id WHERE s.repository_id = ${repositories.id}), 0)`,
        lastScan: sql<Date | null>`(SELECT MAX(s.created_at) FROM scans s WHERE s.repository_id = ${repositories.id})`,
      })
      .from(repositories)
      .leftJoin(projects, eq(projects.id, repositories.projectId))
      .leftJoin(sourceControlImports, eq(sourceControlImports.repositoryId, repositories.id))
      .leftJoin(sourceControls, eq(sourceControls.id, sourceControlImports.sourceControlId))
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset(offset);

    logger.project.info('listRepositoriesByWorkspace completed', { workspaceId, count: rows.length, total });
    return { data: rows, ...buildPaginationMeta(total, page, perPage) };
  },

  /** Attach or create a repository under a project */
  async attachRepository(
    projectId: string,
    workspaceId: string,
    repositoryData: {
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType: string[];
    },
    createdBy: string
  ) {
    logger.project.info('attachRepository', { projectId, name: repositoryData.name });
    const [repo] = await db
      .insert(repositories)
      .values({
        workspaceId: workspaceId,
        projectId: projectId,
        name: repositoryData.name,
        url: repositoryData.url,
        defaultBranch: repositoryData.defaultBranch || 'main',
        connectionType: repositoryData.connectionType,
        createdBy: createdBy,
        updatedBy: createdBy,
      })
      .returning();

    logger.project.info('attachRepository completed', { repoId: repo.id, name: repositoryData.name });
    return repo;
  },

  /** Find external repository by URL under a project (for deduplication on upload) */
  async findExternalRepositoryByUrl(projectId: string, url?: string) {
    if (!url) {
      logger.project.info('findExternalRepositoryByUrl: no url provided', { projectId });
      return null;
    }
    logger.project.info('findExternalRepositoryByUrl', { projectId, url });
    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(
        eq(repositories.projectId, projectId),
        eq(repositories.url, url),
        sql`${repositories.connectionType} @> ARRAY['external']::text[]`,
        isNull(repositories.deletedAt)
      ))
      .limit(1);

    if (!repo) {
      logger.project.warn('findExternalRepositoryByUrl: not found', { projectId, url });
    }
    return repo ?? null;
  },

  /** List member summaries for a project. Excludes soft-deleted users. */
  async listMemberSummaries(projectId: string): Promise<ProjectMemberSummary[]> {
    logger.project.info('listMemberSummaries', { projectId });
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(eq(projectMembers.projectId, projectId), isNull(users.deletedAt)));
    return rows;
  },

  /** List team summaries for a project. Excludes soft-deleted teams. */
  async listTeamSummaries(projectId: string): Promise<ProjectTeamSummary[]> {
    logger.project.info('listTeamSummaries', { projectId });
    const rows = await db
      .select({
        id: teams.id,
        name: teams.name,
      })
      .from(projectTeams)
      .innerJoin(teams, eq(teams.id, projectTeams.teamId))
      .where(and(eq(projectTeams.projectId, projectId), isNull(teams.deletedAt)));
    return rows;
  },

  /** List repository summaries for a project. Excludes soft-deleted repositories. */
  async listRepositorySummaries(projectId: string): Promise<ProjectRepositorySummary[]> {
    logger.project.info('listRepositorySummaries', { projectId });
    const rows = await db
      .select({
        id: repositories.id,
        name: repositories.name,
      })
      .from(repositories)
      .where(and(eq(repositories.projectId, projectId), isNull(repositories.deletedAt)));
    return rows;
  },

  /** Set project members (replace all) — should be called within a transaction */
  async setMembers(projectId: string, userIds: string[], tx?: Tx) {
    logger.project.info('setMembers', { projectId, count: userIds.length });
    if (userIds.length === 0) {
      logger.project.warn('setMembers called with empty userIds — all members will be removed', { projectId });
    }
    try {
      const executor = tx ?? db;
      await executor.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
      if (userIds.length === 0) return;
      await executor.insert(projectMembers).values(
        userIds.map((userId) => ({ projectId: projectId, userId: userId, role: 'member' }))
      );
      logger.project.info('setMembers completed', { projectId, count: userIds.length });
    } catch (err) {
      logger.project.error('setMembers failed', { projectId, error: err });
      throw err;
    }
  },

  /** Set project teams (replace all) — should be called within a transaction */
  async setTeams(projectId: string, teamIds: string[], tx?: Tx) {
    logger.project.info('setTeams', { projectId, count: teamIds.length });
    if (teamIds.length === 0) {
      logger.project.warn('setTeams called with empty teamIds — all teams will be removed', { projectId });
    }
    try {
      const executor = tx ?? db;
      await executor.delete(projectTeams).where(eq(projectTeams.projectId, projectId));
      if (teamIds.length === 0) return;
      await executor.insert(projectTeams).values(
        teamIds.map((teamId) => ({ projectId: projectId, teamId: teamId, role: 'member' }))
      );
      logger.project.info('setTeams completed', { projectId, count: teamIds.length });
    } catch (err) {
      logger.project.error('setTeams failed', { projectId, error: err });
      throw err;
    }
  },

  /** Set project repositories (replace all) — should be called within a transaction */
  async setRepositories(projectId: string, repositoryIds: string[], tx?: Tx) {
    logger.project.info('setRepositories', { projectId, count: repositoryIds.length });
    if (repositoryIds.length === 0) {
      logger.project.warn('setRepositories called with empty repositoryIds — all repositories will be unlinked', { projectId });
    }
    try {
      const executor = tx ?? db;
      // Unlink all repositories currently assigned to this project
      await executor.update(repositories).set({ projectId: null }).where(eq(repositories.projectId, projectId));
      if (repositoryIds.length === 0) return;
      // Link new repositories
      for (const repoId of repositoryIds) {
        await executor.update(repositories).set({ projectId }).where(eq(repositories.id, repoId));
      }
      logger.project.info('setRepositories completed', { projectId, count: repositoryIds.length });
    } catch (err) {
      logger.project.error('setRepositories failed', { projectId, error: err });
      throw err;
    }
  },

  /** Batch: list member summaries for multiple projects. Excludes soft-deleted users. */
  async listMemberSummariesByProjectIds(projectIds: string[]): Promise<Map<string, ProjectMemberSummary[]>> {
    if (projectIds.length === 0) return new Map();
    logger.project.info('listMemberSummariesByProjectIds', { count: projectIds.length });
    const rows = await db
      .select({
        projectId: projectMembers.projectId,
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(inArray(projectMembers.projectId, projectIds), isNull(users.deletedAt)));
    const map = new Map<string, ProjectMemberSummary[]>();
    for (const row of rows) {
      const { projectId, ...summary } = row;
      const list = map.get(projectId) ?? [];
      list.push(summary);
      map.set(projectId, list);
    }
    return map;
  },

  /** Batch: list team summaries for multiple projects. Excludes soft-deleted teams. */
  async listTeamSummariesByProjectIds(projectIds: string[]): Promise<Map<string, ProjectTeamSummary[]>> {
    if (projectIds.length === 0) return new Map();
    logger.project.info('listTeamSummariesByProjectIds', { count: projectIds.length });
    const rows = await db
      .select({
        projectId: projectTeams.projectId,
        id: teams.id,
        name: teams.name,
      })
      .from(projectTeams)
      .innerJoin(teams, eq(teams.id, projectTeams.teamId))
      .where(and(inArray(projectTeams.projectId, projectIds), isNull(teams.deletedAt)));
    const map = new Map<string, ProjectTeamSummary[]>();
    for (const row of rows) {
      const { projectId, ...summary } = row;
      const list = map.get(projectId) ?? [];
      list.push(summary);
      map.set(projectId, list);
    }
    return map;
  },

  /** Batch: list repository summaries for multiple projects. Excludes soft-deleted repositories. */
  async listRepositorySummariesByProjectIds(projectIds: string[]): Promise<Map<string, ProjectRepositorySummary[]>> {
    if (projectIds.length === 0) return new Map();
    logger.project.info('listRepositorySummariesByProjectIds', { count: projectIds.length });
    const rows = await db
      .select({
        projectId: repositories.projectId,
        id: repositories.id,
        name: repositories.name,
      })
      .from(repositories)
      .where(and(inArray(repositories.projectId, projectIds), isNull(repositories.deletedAt)));
    const map = new Map<string, ProjectRepositorySummary[]>();
    for (const row of rows) {
      if (!row.projectId) continue;
      const { projectId, ...summary } = row;
      const list = map.get(projectId) ?? [];
      list.push(summary);
      map.set(projectId, list);
    }
    return map;
  },

  /**
   * Get all projectIds a user can access in a workspace.
   * Owner and manager see everything (returns null).
   * Reviewer and member see only projects they're direct members of or via team assignment.
   * @returns Array of projectIds, or null if user has full access (owner/manager).
   */
  async getAccessibleProjectIds(workspaceId: string, userId: string, role?: string): Promise<string[] | null> {
    logger.project.info('getAccessibleProjectIds', { workspaceId, userId, role });
    // Owner and manager can see all projects
    if (role === 'owner' || role === 'manager') return null;

    // Parallel: direct project membership + team-based project membership
    const [directRows, teamRows] = await Promise.all([
      db
        .select({ projectId: projectMembers.projectId })
        .from(projectMembers)
        .innerJoin(projects, eq(projects.id, projectMembers.projectId))
        .where(and(
          eq(projects.workspaceId, workspaceId),
          eq(projectMembers.userId, userId),
          isNull(projects.deletedAt),
        )),
      db
        .select({ projectId: projectTeams.projectId })
        .from(projectTeams)
        .innerJoin(projects, eq(projects.id, projectTeams.projectId))
        .innerJoin(teamMembers, eq(teamMembers.teamId, projectTeams.teamId))
        .where(and(
          eq(projects.workspaceId, workspaceId),
          eq(teamMembers.userId, userId),
          isNull(projects.deletedAt),
        )),
    ]);

    const ids = new Set<string>();
    for (const r of directRows) ids.add(r.projectId);
    for (const r of teamRows) ids.add(r.projectId);
    const result = [...ids];
    logger.project.info('getAccessibleProjectIds completed', { workspaceId, userId, count: result.length });
    return result;
  },

  /**
   * Get all members of a project (direct + team-based).
   * @returns Array of { userId, name, email, role, avatarUrl } for all accessible members.
   *   Team-based members have role = null (team membership has no role; workspace role applies).
   */
  async getProjectMembers(projectId: string, workspaceId: string) {
    logger.project.info('getProjectMembers', { projectId, workspaceId });
    // Parallel: direct members + team-based members
    const [directMembers, teamMemberRows] = await Promise.all([
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
          role: projectMembers.role,
        })
        .from(projectMembers)
        .innerJoin(users, eq(users.id, projectMembers.userId))
        .innerJoin(projects, eq(projects.id, projectMembers.projectId))
        .where(and(
          eq(projectMembers.projectId, projectId),
          eq(projects.workspaceId, workspaceId),
        )),
      db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .innerJoin(projectTeams, eq(projectTeams.teamId, teamMembers.teamId))
        .innerJoin(projects, eq(projects.id, projectTeams.projectId))
        .where(and(
          eq(projectTeams.projectId, projectId),
          eq(projects.workspaceId, workspaceId),
        )),
    ]);

    // Deduplicate: direct membership takes precedence
    const seen = new Set<string>();
    // Team-based members don't have a project-level role; workspace role applies separately
    const result: Array<{ userId: string; name: string; email: string; avatarUrl: string | null; role: string | null }> = [];
    for (const m of directMembers) {
      seen.add(m.userId);
      result.push(m);
    }
    for (const m of teamMemberRows) {
      if (!seen.has(m.userId)) {
        seen.add(m.userId);
        result.push({ ...m, role: null });
      }
    }
    logger.project.info('getProjectMembers completed', { projectId, count: result.length });
    return result;
  },

};

import { eq, and, isNull, inArray, count, sql } from 'drizzle-orm';

import type { TeamListQuery } from '@/commons/schemas';
import { db } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import { projectTeams, projects } from '@drizzle/schema/projects';
import { teams, teamMembers } from '@drizzle/schema/teams';
import { users } from '@drizzle/schema/users';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const teamRepository = {
  /**
   * List non-deleted teams in a workspace (unpaginated — used for enrichment).
   */
  async list(workspaceId: string) {
    logger.team.info('list', { workspaceId });
    const rows = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));
    logger.team.info('list completed', { workspaceId, count: rows.length });
    return rows;
  },

  /**
   * List teams with DB-level search, sort, and pagination.
   *
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters (lenient validation from Zod)
   * @returns Paginated team list with total, page, perPage, lastPage
   */
  async listPaginated(workspaceId: string, params?: TeamListQuery) {
    logger.team.info('listByWorkspacePaginated', { workspaceId });
    const conditions = [eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)];

    // Search (name, description)
    conditions.push(...buildSearch(params?.search, teams.name, teams.description));

    // Project filter: team must be associated with this project
    if (params?.project) {
      conditions.push(
        sql`${teams.id} IN (SELECT ${projectTeams.teamId} FROM ${projectTeams} WHERE ${projectTeams.projectId} = ${params.project})`
      );
    }

    // Count total
    const [{ total }] = await db
      .select({ total: count() })
      .from(teams)
      .where(and(...conditions));

    // Sort (reusable)
    const sortExpr = buildSort(
      params?.sort, params?.order,
      { name: teams.name, createdAt: teams.createdAt, updatedAt: teams.updatedAt },
      teams.createdAt,
    );

    // Paginate
    const page = params?.page ?? 1;
    const perPage = params?.perPage ?? 10;

    const data = await db
      .select()
      .from(teams)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.team.info('listByWorkspacePaginated completed', { workspaceId, count: data.length, total });
    return { data, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * List all teams in a workspace enriched with member counts and project associations.
   * @param workspaceId - Workspace UUID
   * @returns Array of team records with memberCount, projects, and projectIds fields
   */
  async listByWorkspaceWithSummaries(workspaceId: string) {
    logger.team.info('listByWorkspaceWithSummaries', { workspaceId });
    const rows = await this.list(workspaceId);
    const teamIds = rows.map((team) => team.id);

    if (teamIds.length === 0) {
      logger.team.info('listByWorkspaceWithSummaries completed', { workspaceId, count: 0 });
      return [];
    }

    const [memberCounts, projectRows] = await Promise.all([
      db
        .select({
          teamId: teamMembers.teamId,
          memberCount: count(teamMembers.id),
        })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds))
        .groupBy(teamMembers.teamId),
      db
        .select({
          teamId: projectTeams.teamId,
          projectName: projects.name,
          projectId: projectTeams.projectId,
        })
        .from(projectTeams)
        .innerJoin(projects, eq(projectTeams.projectId, projects.id))
        .where(and(inArray(projectTeams.teamId, teamIds), isNull(projects.deletedAt))),
    ]);

    const memberCountByTeam = new Map(memberCounts.map((row) => [row.teamId, row.memberCount]));
    const projectsByTeam = new Map<string, string[]>();
    const projectIdsByTeam = new Map<string, string[]>();
    for (const row of projectRows) {
      if (!row.teamId || !row.projectName) continue;
      const current = projectsByTeam.get(row.teamId) ?? [];
      current.push(row.projectName);
      projectsByTeam.set(row.teamId, current);
      
      const currentIds = projectIdsByTeam.get(row.teamId) ?? [];
      currentIds.push(row.projectId);
      projectIdsByTeam.set(row.teamId, currentIds);
    }

    const result = rows.map((team) => ({
      ...team,
      memberCount: memberCountByTeam.get(team.id) ?? 0,
      projects: projectsByTeam.get(team.id) ?? [],
      projectIds: projectIdsByTeam.get(team.id) ?? [],
    }));

    logger.team.info('listByWorkspaceWithSummaries completed', { workspaceId, count: result.length });
    return result;
  },

  /**
   * Find a non-deleted team by ID.
   * @param id - Team UUID
   * @returns Team record or null if not found
   */
  async findById(id: string) {
    logger.team.info('findById', { id });
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), isNull(teams.deletedAt))).limit(1);
    if (!team) {
      logger.team.warn('findById: team not found', { id });
    }
    return team ?? null;
  },

  /**
   * Find a non-deleted team by slug within a workspace.
   * @param workspaceId - Workspace UUID
   * @param slug - Team slug to search
   * @returns Team record or null if not found
   */
  async findBySlug(workspaceId: string, slug: string) {
    logger.team.info('findBySlug', { workspaceId, slug });
    const [team] = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), eq(teams.slug, slug), isNull(teams.deletedAt))).limit(1);
    if (!team) {
      logger.team.warn('findBySlug: team not found', { workspaceId, slug });
    }
    return team ?? null;
  },

  /**
   * Create a new team record.
   * @param data - Team data (workspaceId, name, slug, optional description, createdBy)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created team record
   */
  async create(data: { workspaceId: string; name: string; slug: string; description?: string; createdBy: string }, tx?: Tx) {
    logger.team.info('create', { workspaceId: data.workspaceId, name: data.name, slug: data.slug });
    const executor = tx ?? db;
    const [team] = await executor.insert(teams).values({ workspaceId: data.workspaceId, name: data.name, slug: data.slug, description: data.description, createdBy: data.createdBy, updatedBy: data.createdBy }).returning();
    logger.team.info('create completed', { teamId: team.id, name: data.name });
    return team;
  },

  /**
   * Update a team record.
   * @param id - Team UUID
   * @param data - Fields to update (name, slug, description, updatedBy)
   * @returns Updated team record
   */
  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }) {
    logger.team.info('update', { id });
    const [team] = await db.update(teams).set({ name: data.name, slug: data.slug, description: data.description, updatedBy: data.updatedBy, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
    logger.team.info('update completed', { id });
    return team;
  },

  /**
   * Soft-delete a team by setting deletedAt timestamp.
   * @param id - Team UUID
   * @param deletedBy - User UUID of the deleter
   * @returns Updated team record
   */
  async softDelete(id: string, deletedBy: string) {
    logger.team.info('softDelete', { id, deletedBy });
    const [team] = await db.update(teams).set({ deletedAt: new Date(), deletedBy }).where(eq(teams.id, id)).returning();
    logger.team.info('softDelete completed', { id });
    return team;
  },

  /**
   * List all members of a team with their user profile information.
   * @param teamId - Team UUID
   * @returns Array of member records joined with user data
   */
  async listMembers(teamId: string) {
    logger.team.info('listMembers', { teamId });
    const rows = await db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, teamId), isNull(users.deletedAt)));
    logger.team.info('listMembers completed', { teamId, count: rows.length });
    return rows;
  },

  /**
   * Add a user to a team.
   * @param teamId - Team UUID
   * @param userId - User UUID to add
   * @returns Created team member record
   */
  async addMember(teamId: string, userId: string) {
    logger.team.info('addMember', { teamId, userId });
    try {
      const [member] = await db.insert(teamMembers).values({ teamId, userId }).returning();
      logger.team.info('addMember completed', { teamId, userId });
      return member;
    } catch (error) {
      logger.team.error('addMember: failed to add member', { teamId, userId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Remove a user from a team.
   * @param teamId - Team UUID
   * @param userId - User UUID to remove
   */
  async removeMember(teamId: string, userId: string) {
    logger.team.info('removeMember', { teamId, userId });
    try {
      await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
      logger.team.info('removeMember completed', { teamId, userId });
    } catch (error) {
      logger.team.error('removeMember: failed to remove member', { teamId, userId, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Replace all members of a team with a new set of user IDs.
   * @param teamId - Team UUID
   * @param memberIds - Array of user UUIDs to set as members
   * @param tx - Optional transaction context for atomic operations
   * @returns Array of created team member records
   */
  async setMembers(teamId: string, memberIds: string[], tx?: Tx) {
    logger.team.info('setMembers', { teamId, count: memberIds.length });
    if (memberIds.length === 0) logger.team.warn('setMembers: empty memberIds', { teamId });
    try {
      const executor = tx ?? db;
      await executor.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
      if (memberIds.length === 0) return [];
      const rows = memberIds.map((userId) => ({ teamId, userId, role: 'contributor' as const }));
      const result = await executor.insert(teamMembers).values(rows).returning();
      logger.team.info('setMembers completed', { teamId, count: result.length });
      return result;
    } catch (error) {
      logger.team.error('setMembers: failed to set members', { teamId, count: memberIds.length, error: error instanceof Error ? error.message : error });
      throw error;
    }
  },

  /**
   * Get all user IDs that are members of a team.
   * @param teamId - Team UUID
   * @returns Array of user UUIDs
   */
  async getMemberIds(teamId: string): Promise<string[]> {
    logger.team.info('getMemberIds', { teamId });
    const rows = await db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return rows.map(r => r.userId);
  },

  /**
   * Get the total number of members in a team.
   * @param teamId - Team UUID
   * @returns Member count
   */
  async getMemberCount(teamId: string): Promise<number> {
    logger.team.info('getMemberCount', { teamId });
    const [result] = await db.select({ count: count(teamMembers.id) }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return Number(result?.count ?? 0);
  },

  /**
   * Get the total number of projects associated with a team.
   * @param teamId - Team UUID
   * @returns Project count
   */
  async getProjectCount(teamId: string): Promise<number> {
    logger.team.info('getProjectCount', { teamId });
    const [result] = await db.select({ count: count(projectTeams.id) }).from(projectTeams).where(eq(projectTeams.teamId, teamId));
    return Number(result?.count ?? 0);
  },

  /**
   * Get the names of all non-deleted projects associated with a team.
   * @param teamId - Team UUID
   * @returns Array of project names
   */
  async getProjectNames(teamId: string): Promise<string[]> {
    logger.team.info('getProjectNames', { teamId });
    const rows = await db.select({ name: projects.name })
      .from(projectTeams)
      .innerJoin(projects, eq(projectTeams.projectId, projects.id))
      .where(and(eq(projectTeams.teamId, teamId), isNull(projects.deletedAt)));
    return rows.flatMap(r => r.name ? [r.name] : []);
  },

  /**
   * List teams with pagination + enrichment (member counts, projects).
   * Combines listPaginated with summary data.
   */
  async listPaginatedWithSummaries(workspaceId: string, params?: TeamListQuery) {
    logger.team.info('listPaginatedWithSummaries', { workspaceId });
    const paginated = await this.listPaginated(workspaceId, params);
    if (paginated.data.length === 0) {
      return { data: [], total: paginated.total, page: paginated.page, perPage: paginated.perPage, lastPage: paginated.lastPage };
    }

    const teamIds = paginated.data.map((t) => t.id);
    const [memberCounts, projectRows] = await Promise.all([
      db.select({ teamId: teamMembers.teamId, memberCount: count(teamMembers.id) })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds))
        .groupBy(teamMembers.teamId),
      db.select({ teamId: projectTeams.teamId, projectName: projects.name, projectId: projectTeams.projectId })
        .from(projectTeams)
        .innerJoin(projects, eq(projectTeams.projectId, projects.id))
        .where(and(inArray(projectTeams.teamId, teamIds), isNull(projects.deletedAt))),
    ]);

    const memberCountByTeam = new Map(memberCounts.map((r) => [r.teamId, r.memberCount]));
    const projectsByTeam = new Map<string, string[]>();
    const projectIdsByTeam = new Map<string, string[]>();
    for (const row of projectRows) {
      if (!row.teamId || !row.projectName) continue;
      const names = projectsByTeam.get(row.teamId) ?? [];
      names.push(row.projectName);
      projectsByTeam.set(row.teamId, names);
      const ids = projectIdsByTeam.get(row.teamId) ?? [];
      ids.push(row.projectId);
      projectIdsByTeam.set(row.teamId, ids);
    }

    const data = paginated.data.map((team) => ({
      ...team,
      memberCount: memberCountByTeam.get(team.id) ?? 0,
      projects: projectsByTeam.get(team.id) ?? [],
      projectIds: projectIdsByTeam.get(team.id) ?? [],
    }));

    logger.team.info('listPaginatedWithSummaries completed', { workspaceId, count: data.length });
    return { data, total: paginated.total, page: paginated.page, perPage: paginated.perPage, lastPage: paginated.lastPage };
  },
};

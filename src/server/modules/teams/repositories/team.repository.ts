import { eq, and, isNull, inArray, count, sql } from 'drizzle-orm';

import type { TeamFormInput, TeamListQuery, TeamUpdateInput } from '@/commons/schemas';
import type { Tx } from '@/server/db/client';
import { db } from '@/server/db/client';
import { logger } from '@/server/lib/logger';
import { buildSearch, buildSort, buildPaginationMeta } from '@/server/lib/query';
import type { IRepository, Paginated } from '@/server/modules/shared/contracts';
import { projectTeams, projects } from '@drizzle/schema/projects';
import { teams, teamMembers, type Team, type TeamMember } from '@drizzle/schema/teams';
import { users } from '@drizzle/schema/users';

export type TeamMemberView = {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  joinedAt: Date;
};

export type TeamWithSummary = Team & {
  memberCount: number;
  projects: string[];
  projectIds: string[];
};

export type TeamWithMembers = Team & {
  members: TeamMemberView[];
};

type CreateTeamData = Omit<TeamFormInput, 'memberIds'>;
type UpdateTeamData = Omit<TeamUpdateInput, 'memberIds'>;

export interface TeamRepository extends IRepository<Team, CreateTeamData, UpdateTeamData, TeamListQuery> {
  findBySlug(workspaceId: string, slug: string, tx?: Tx): Promise<Team | null>;
  setMembers(teamId: string, memberIds: string[], tx?: Tx): Promise<TeamMember[]>;
  getMemberIds(teamId: string): Promise<string[]>;
  getMemberCount(teamId: string): Promise<number>;
  getProjectCount(teamId: string): Promise<number>;
  getProjectNames(teamId: string): Promise<string[]>;
  listMembers(teamId: string): Promise<TeamMemberView[]>;
  addMember(teamId: string, userId: string): Promise<TeamMember>;
  removeMember(teamId: string, userId: string): Promise<void>;
  listByWorkspaceWithSummaries(workspaceId: string): Promise<TeamWithSummary[]>;
  listPaginatedWithSummaries(workspaceId: string, params?: TeamListQuery): Promise<Paginated<TeamWithSummary>>;
}

export const teamRepository: TeamRepository = {
  /**
   * List non-deleted teams in a workspace (unpaginated — used for enrichment).
   */
  async listAll(workspaceId: string) {
    logger.team.info('listAll', { workspaceId });
    const rows = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));
    logger.team.info('listAll completed', { workspaceId, count: rows.length });
    return rows;
  },

  /**
   * List teams with DB-level search, sort, and pagination.
   *
   * @param workspaceId - Workspace UUID
   * @param params - Query parameters (lenient validation from Zod)
   * @returns Paginated team list with total, page, perPage, lastPage
   */
  async list(workspaceId: string, params?: TeamListQuery, tx?: Tx) {
    logger.team.info('list', { workspaceId });
    const exec = tx ?? db;
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
    const [{ total }] = await exec
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

    const data = await exec
      .select()
      .from(teams)
      .where(and(...conditions))
      .orderBy(sortExpr)
      .limit(perPage)
      .offset((page - 1) * perPage);

    logger.team.info('list completed', { workspaceId, count: data.length, total });
    return { data, ...buildPaginationMeta(total, page, perPage) };
  },

  /**
   * List all teams in a workspace enriched with member counts and project associations.
   * @param workspaceId - Workspace UUID
   * @returns Array of team records with memberCount, projects, and projectIds fields
   */
  async listByWorkspaceWithSummaries(workspaceId: string) {
    logger.team.info('listByWorkspaceWithSummaries', { workspaceId });
    const rows = await this.listAll(workspaceId);
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
   * @param workspaceId - Workspace UUID
   * @param data - Team data (name, slug, optional description)
   * @param createdBy - User UUID of the creator
   * @param tx - Optional transaction context for atomic operations
   * @returns Created team record
   */
  async create(workspaceId: string, data: CreateTeamData, createdBy: string, tx?: Tx) {
    const slug = data.slug || data.name.toLowerCase().replace(/\s+/g, '-').slice(0, 100);
    logger.team.info('create', { workspaceId, name: data.name, slug });
    const executor = tx ?? db;
    const [team] = await executor.insert(teams).values({ workspaceId, name: data.name, slug, description: data.description, createdBy, updatedBy: createdBy }).returning();
    logger.team.info('create completed', { teamId: team.id, name: data.name });
    return team;
  },

  /**
   * Update a team record.
   * @param id - Team UUID
   * @param data - Fields to update (name, slug, description)
   * @param updatedBy - User UUID of the updater
   * @param tx - Optional transaction context for atomic operations
   * @returns Updated team record
   */
  async update(id: string, data: UpdateTeamData, updatedBy: string, tx?: Tx) {
    logger.team.info('update', { id });
    const executor = tx ?? db;
    const [team] = await executor.update(teams).set({ name: data.name, slug: data.slug, description: data.description, updatedBy, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
    logger.team.info('update completed', { id });
    return team;
  },

  /**
   * Soft-delete a team by setting deletedAt timestamp.
   * @param id - Team UUID
   * @param deletedBy - User UUID of the deleter
   * @returns Updated team record
   */
  async softDelete(id: string, deletedBy: string, tx?: Tx) {
    logger.team.info('softDelete', { id, deletedBy });
    const exec = tx ?? db;
    const [team] = await exec.update(teams).set({ deletedAt: new Date(), deletedBy }).where(eq(teams.id, id)).returning();
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
    const [member] = await db.insert(teamMembers).values({ teamId, userId }).returning();
    logger.team.info('addMember completed', { teamId, userId });
    return member;
  },

  /**
   * Remove a user from a team.
   * @param teamId - Team UUID
   * @param userId - User UUID to remove
   */
  async removeMember(teamId: string, userId: string) {
    logger.team.info('removeMember', { teamId, userId });
    await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    logger.team.info('removeMember completed', { teamId, userId });
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
    const executor = tx ?? db;
    await executor.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (memberIds.length === 0) return [];
    const rows = memberIds.map((userId) => ({ teamId, userId, role: 'contributor' as const }));
    const result = await executor.insert(teamMembers).values(rows).returning();
    logger.team.info('setMembers completed', { teamId, count: result.length });
    return result;
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
    const paginated = await this.list(workspaceId, params);
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

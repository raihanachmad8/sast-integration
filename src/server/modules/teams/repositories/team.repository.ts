import { eq, and, isNull, inArray, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { teams, teamMembers } from '@drizzle/schema/teams';
import { users } from '@drizzle/schema/users';
import { projectTeams, projects } from '@drizzle/schema/projects';
import { logger } from '@/server/lib/logger';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const teamRepository = {
  /**
   * List all non-deleted teams in a workspace.
   * @param workspaceId - Workspace UUID
   * @returns Array of team records
   */
  async listByWorkspace(workspaceId: string) {
    return db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));
  },

  /**
   * List all teams in a workspace enriched with member counts and project associations.
   * @param workspaceId - Workspace UUID
   * @returns Array of team records with memberCount, projects, and projectIds fields
   */
  async listByWorkspaceWithSummaries(workspaceId: string) {
    const rows = await this.listByWorkspace(workspaceId);
    const teamIds = rows.map((team) => team.id);

    if (teamIds.length === 0) {
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

    return rows.map((team) => ({
      ...team,
      memberCount: memberCountByTeam.get(team.id) ?? 0,
      projects: projectsByTeam.get(team.id) ?? [],
      projectIds: projectIdsByTeam.get(team.id) ?? [],
    }));
  },

  /**
   * Find a non-deleted team by ID.
   * @param id - Team UUID
   * @returns Team record or null if not found
   */
  async findById(id: string) {
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), isNull(teams.deletedAt))).limit(1);
    return team ?? null;
  },

  /**
   * Find a non-deleted team by slug within a workspace.
   * @param workspaceId - Workspace UUID
   * @param slug - Team slug to search
   * @returns Team record or null if not found
   */
  async findBySlug(workspaceId: string, slug: string) {
    const [team] = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), eq(teams.slug, slug), isNull(teams.deletedAt))).limit(1);
    return team ?? null;
  },

  /**
   * Create a new team record.
   * @param data - Team data (workspaceId, name, slug, optional description, createdBy)
   * @param tx - Optional transaction context for atomic operations
   * @returns Created team record
   */
  async create(data: { workspaceId: string; name: string; slug: string; description?: string; createdBy: string }, tx?: Tx) {
    const executor = tx ?? db;
    const [team] = await executor.insert(teams).values({ workspaceId: data.workspaceId, name: data.name, slug: data.slug, description: data.description, createdBy: data.createdBy, updatedBy: data.createdBy }).returning();
    return team;
  },

  /**
   * Update a team record.
   * @param id - Team UUID
   * @param data - Fields to update (name, slug, description, updatedBy)
   * @returns Updated team record
   */
  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }) {
    const [team] = await db.update(teams).set({ name: data.name, slug: data.slug, description: data.description, updatedBy: data.updatedBy, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
    return team;
  },

  /**
   * Soft-delete a team by setting deletedAt timestamp.
   * @param id - Team UUID
   * @param deletedBy - User UUID of the deleter
   * @returns Updated team record
   */
  async softDelete(id: string, deletedBy: string) {
    const [team] = await db.update(teams).set({ deletedAt: new Date(), deletedBy }).where(eq(teams.id, id)).returning();
    return team;
  },

  /**
   * List all members of a team with their user profile information.
   * @param teamId - Team UUID
   * @returns Array of member records joined with user data
   */
  async listMembers(teamId: string) {
    return db
      .select({
        id: teamMembers.id,
        userId: teamMembers.userId,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: teamMembers.role,
        joinedAt: teamMembers.joinedAt,
      })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(and(eq(teamMembers.teamId, teamId), isNull(users.deletedAt)));
  },

  /**
   * Add a user to a team.
   * @param teamId - Team UUID
   * @param userId - User UUID to add
   * @param role - Member role (default: 'contributor')
   * @returns Created team member record
   */
  async addMember(teamId: string, userId: string, role: 'admin' | 'contributor' = 'contributor') {
    const [member] = await db.insert(teamMembers).values({ teamId, userId, role }).returning();
    return member;
  },

  /**
   * Remove a user from a team.
   * @param teamId - Team UUID
   * @param userId - User UUID to remove
   */
  async removeMember(teamId: string, userId: string) {
    await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  },

  /**
   * Replace all members of a team with a new set of user IDs.
   * @param teamId - Team UUID
   * @param memberIds - Array of user UUIDs to set as members
   * @param tx - Optional transaction context for atomic operations
   * @returns Array of created team member records
   */
  async setMembers(teamId: string, memberIds: string[], tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (memberIds.length === 0) return [];
    const rows = memberIds.map((userId) => ({ teamId, userId, role: 'contributor' as const }));
    return executor.insert(teamMembers).values(rows).returning();
  },

  /**
   * Get all user IDs that are members of a team.
   * @param teamId - Team UUID
   * @returns Array of user UUIDs
   */
  async getMemberIds(teamId: string): Promise<string[]> {
    const rows = await db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return rows.map(r => r.userId);
  },

  /**
   * Get the total number of members in a team.
   * @param teamId - Team UUID
   * @returns Member count
   */
  async getMemberCount(teamId: string): Promise<number> {
    const [result] = await db.select({ count: count(teamMembers.id) }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return Number(result?.count ?? 0);
  },

  /**
   * Get the total number of projects associated with a team.
   * @param teamId - Team UUID
   * @returns Project count
   */
  async getProjectCount(teamId: string): Promise<number> {
    const [result] = await db.select({ count: count(projectTeams.id) }).from(projectTeams).where(eq(projectTeams.teamId, teamId));
    return Number(result?.count ?? 0);
  },

  /**
   * Get the names of all non-deleted projects associated with a team.
   * @param teamId - Team UUID
   * @returns Array of project names
   */
  async getProjectNames(teamId: string): Promise<string[]> {
    const rows = await db.select({ name: projects.name })
      .from(projectTeams)
      .innerJoin(projects, eq(projectTeams.projectId, projects.id))
      .where(and(eq(projectTeams.teamId, teamId), isNull(projects.deletedAt)));
    return rows.flatMap(r => r.name ? [r.name] : []);
  },
};

import { eq, and, isNull, inArray, count } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { teams, teamMembers } from '@drizzle/schema/teams';
import { users } from '@drizzle/schema/users';
import { projectTeams, projects } from '@drizzle/schema/projects';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const teamRepository = {
  async listByWorkspace(workspaceId: string) {
     
    console.debug(`[TeamRepo] listByWorkspace - workspaceId=${workspaceId}`);
     
    const result = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), isNull(teams.deletedAt)));
     
    console.debug(`[TeamRepo] listByWorkspace result - count=${result.length}`);
     
    return result;
  },

  async listByWorkspaceWithSummaries(workspaceId: string) {
     
    console.debug(`[TeamRepo] listByWorkspaceWithSummaries - workspaceId=${workspaceId}`);
     
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
          teamId: projectTeams.team_id,
          projectName: projects.name,
        })
        .from(projectTeams)
        .innerJoin(projects, eq(projectTeams.project_id, projects.id))
        .where(inArray(projectTeams.team_id, teamIds)),
    ]);

    const memberCountByTeam = new Map(memberCounts.map((row) => [row.teamId, row.memberCount]));
    const projectsByTeam = new Map<string, string[]>();
    for (const row of projectRows) {
      if (!row.teamId || !row.projectName) continue;
      const current = projectsByTeam.get(row.teamId) ?? [];
      current.push(row.projectName);
      projectsByTeam.set(row.teamId, current);
    }

    return rows.map((team) => ({
      ...team,
      memberCount: memberCountByTeam.get(team.id) ?? 0,
      projects: projectsByTeam.get(team.id) ?? [],
    }));
  },

  async findById(id: string) {
     
    console.debug(`[TeamRepo] findById - id=${id}`);
     
    const [team] = await db.select().from(teams).where(and(eq(teams.id, id), isNull(teams.deletedAt))).limit(1);
    return team ?? null;
  },

  async findBySlug(workspaceId: string, slug: string) {
    const [team] = await db.select().from(teams).where(and(eq(teams.workspaceId, workspaceId), eq(teams.slug, slug), isNull(teams.deletedAt))).limit(1);
    return team ?? null;
  },

  async create(data: { workspaceId: string; name: string; slug: string; description?: string; createdBy: string }) {
     
    console.debug(`[TeamRepo] create - name=${data.name}`);
     
    const [team] = await db.insert(teams).values({ workspaceId: data.workspaceId, name: data.name, slug: data.slug, description: data.description, createdBy: data.createdBy, updatedBy: data.createdBy }).returning();
     
    console.debug(`[TeamRepo] create success - id=${team.id}`);
     
    return team;
  },

  async update(id: string, data: { name?: string; slug?: string; description?: string; updatedBy: string }) {
     
    console.debug(`[TeamRepo] update - id=${id}`);
     
    const [team] = await db.update(teams).set({ name: data.name, slug: data.slug, description: data.description, updatedBy: data.updatedBy, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
    return team;
  },

  async softDelete(id: string, deletedBy: string) {
     
    console.debug(`[TeamRepo] softDelete - id=${id}`);
     
    const [team] = await db.update(teams).set({ deletedAt: new Date(), deletedBy }).where(eq(teams.id, id)).returning();
    return team;
  },

  async listMembers(teamId: string) {
     
    console.debug(`[TeamRepo] listMembers - teamId=${teamId}`);
     
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
      .where(eq(teamMembers.teamId, teamId));
  },

  async addMember(teamId: string, userId: string, role: 'admin' | 'contributor' = 'contributor') {
     
    console.debug(`[TeamRepo] addMember - teamId=${teamId}, userId=${userId}`);
     
    const [member] = await db.insert(teamMembers).values({ teamId, userId, role }).returning();
    return member;
  },

  async removeMember(teamId: string, userId: string) {
     
    console.debug(`[TeamRepo] removeMember - teamId=${teamId}, userId=${userId}`);
     
    await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  },

  async setMembers(teamId: string, memberIds: string[], tx?: Tx) {
     
    console.debug(`[TeamRepo] setMembers - teamId=${teamId}, count=${memberIds.length}`);
     
    const executor = tx ?? db;
    await executor.delete(teamMembers).where(eq(teamMembers.teamId, teamId));
    if (memberIds.length === 0) return [];
    const rows = memberIds.map((userId) => ({ teamId, userId, role: 'contributor' as const }));
    return executor.insert(teamMembers).values(rows).returning();
  },

  async getMemberIds(teamId: string): Promise<string[]> {
    const rows = await db.select({ userId: teamMembers.userId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return rows.map(r => r.userId);
  },

  async getMemberCount(teamId: string): Promise<number> {
    const rows = await db.select({ count: teamMembers.id }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
    return rows.length;
  },

  async getProjectCount(teamId: string): Promise<number> {
    const rows = await db.select({ id: projectTeams.id }).from(projectTeams).where(eq(projectTeams.team_id, teamId));
    return rows.length;
  },

  async getProjectNames(teamId: string): Promise<string[]> {
    const rows = await db.select({ name: projects.name })
      .from(projectTeams)
      .innerJoin(projects, eq(projectTeams.project_id, projects.id))
      .where(eq(projectTeams.team_id, teamId));
    return rows.flatMap(r => r.name ? [r.name] : []);
  },
};

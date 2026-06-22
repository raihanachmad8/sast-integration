import { eq, and, or, isNull, inArray, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { projects, projectMembers, projectTeams } from '@drizzle/schema/projects';
import { repositories } from '@drizzle/schema/source-controls';
import { users } from '@drizzle/schema/users';
import { teams, teamMembers } from '@drizzle/schema/teams';
import { REPOSITORY_CONNECTION_TYPES, type RepositoryConnectionType } from '../constants';

import { sourceControlImports, sourceControls } from '@drizzle/schema/source-controls';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const projectRepository = {
  /** List all projects for a workspace (with soft delete filter) */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), isNull(projects.deletedAt)));
  },

  /** Find project by ID */
  async findById(id: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);
    return project ?? null;
  },

  /** Find a repository by ID and ensure it belongs to the given workspace */
  async findRepositoryByIdAndWorkspace(repositoryId: string, workspaceId: string) {
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

    return result ?? null;
  },

  /** Get the workspaceId that owns a given repository */
  async getWorkspaceIdByRepositoryId(repositoryId: string) {
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
    const executor = tx ?? db;
    const [project] = await executor
      .select()
      .from(projects)
      .where(and(eq(projects.workspaceId, workspaceId), eq(projects.slug, slug), isNull(projects.deletedAt)))
      .limit(1);
    return project ?? null;
  },

  /** Create a new project */
  async create(data: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
    platform?: string;
    language?: string;
    avatarUrl?: string;
    createdBy: string;
  }, tx?: Tx) {
    const executor = tx ?? db;
    const [project] = await executor
      .insert(projects)
      .values({
        workspaceId: data.workspaceId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        platform: data.platform,
        language: data.language,
        avatarUrl: data.avatarUrl,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
      })
      .returning();
    return project;
  },

  /** Update project */
  async update(id: string, data: {
    name?: string;
    slug?: string;
    description?: string;
    platform?: string;
    language?: string;
    avatarUrl?: string;
    updatedBy: string;
  }) {
    const [project] = await db
      .update(projects)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description,
        platform: data.platform,
        language: data.language,
        avatarUrl: data.avatarUrl,
        updatedBy: data.updatedBy,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();
    return project;
  },

  /** Soft delete project */
  async softDelete(id: string, deletedBy: string) {
    const [project] = await db
      .update(projects)
      .set({
        deletedAt: new Date(),
        deletedBy: deletedBy,
      })
      .where(eq(projects.id, id))
      .returning();
    return project;
  },

  /** List repositories belonging to this project */
  async listRepositories(projectId: string) {
    return db
      .select()
      .from(repositories)
      .where(and(eq(repositories.projectId, projectId), isNull(repositories.deletedAt)));
  },

  /** List all repositories across all projects in a workspace (discovered + imported) */
  async listRepositoriesByWorkspace(workspaceId: string, filterMode?: 'imported' | 'manual', accessibleProjectIds?: string[]) {
    const conditions = [
      eq(repositories.workspaceId, workspaceId),
      isNull(repositories.deletedAt),
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

    return db
      .select({
        id: repositories.id,
        name: repositories.name,
        url: repositories.url,
        defaultBranch: repositories.defaultBranch,
        connectionType: repositories.connectionType,
        importMode: repositories.importMode,
        projectId: repositories.projectId,
        projectName: projects.name,
        provider: sourceControls.provider,
        providerName: sourceControls.name,
        createdAt: repositories.createdAt,
        lastSyncedAt: repositories.lastSyncedAt,
        scanCount: sql<number>`(SELECT COUNT(*)::int FROM scans WHERE repository_id = ${repositories.id})`,
        findingCount: sql<number>`(SELECT COUNT(*)::int FROM findings f JOIN scans s ON f.scan_id = s.id WHERE s.repository_id = ${repositories.id})`,
        lastScan: sql<Date | null>`(SELECT MAX(created_at) FROM scans WHERE repository_id = ${repositories.id})`,
      })
      .from(repositories)
      .leftJoin(projects, eq(projects.id, repositories.projectId))
      .leftJoin(sourceControlImports, eq(sourceControlImports.repositoryId, repositories.id))
      .leftJoin(sourceControls, eq(sourceControls.id, sourceControlImports.sourceControlId))
      .where(and(...conditions));
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

    return repo;
  },

  /** Find external repository by URL under a project (for deduplication on upload) */
  async findExternalRepositoryByUrl(projectId: string, url?: string) {
    if (!url) return null;

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

    return repo ?? null;
  },

  /** List member IDs for a project */
  async listMemberIds(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(eq(projectMembers.projectId, projectId));
    return rows.map((r) => r.userId);
  },

  /** List team IDs for a project */
  async listTeamIds(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(eq(projectTeams.projectId, projectId));
    return rows.map((r) => r.teamId);
  },

  /** List repository IDs for a project */
  async listRepositoryIds(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ id: repositories.id })
      .from(repositories)
      .where(and(eq(repositories.projectId, projectId), isNull(repositories.deletedAt)));
    return rows.map((r) => r.id);
  },

  /** List repository names for a project (display purposes) */
  async listRepositoryNames(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ name: repositories.name })
      .from(repositories)
      .where(and(eq(repositories.projectId, projectId), isNull(repositories.deletedAt)));
    return rows.map((r) => r.name);
  },

  /** List member names for display. Excludes soft-deleted users. */
  async listMemberNames(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ name: users.name })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(eq(projectMembers.projectId, projectId), isNull(users.deletedAt)));
    return rows.map((r) => r.name);
  },

  /** List team names for display. Excludes soft-deleted teams. */
  async listTeamNames(projectId: string): Promise<string[]> {
    const rows = await db
      .select({ name: teams.name })
      .from(projectTeams)
      .innerJoin(teams, eq(teams.id, projectTeams.teamId))
      .where(and(eq(projectTeams.projectId, projectId), isNull(teams.deletedAt)));
    return rows.map((r) => r.name);
  },

  /** Set project members (replace all) — should be called within a transaction */
  async setMembers(projectId: string, userIds: string[], tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(projectMembers).where(eq(projectMembers.projectId, projectId));
    if (userIds.length === 0) return;
    await executor.insert(projectMembers).values(
      userIds.map((userId) => ({ projectId: projectId, userId: userId, role: 'member' }))
    );
  },

  /** Set project teams (replace all) — should be called within a transaction */
  async setTeams(projectId: string, teamIds: string[], tx?: Tx) {
    const executor = tx ?? db;
    await executor.delete(projectTeams).where(eq(projectTeams.projectId, projectId));
    if (teamIds.length === 0) return;
    await executor.insert(projectTeams).values(
      teamIds.map((teamId) => ({ projectId: projectId, teamId: teamId, role: 'member' }))
    );
  },

  /** Batch: list member IDs for multiple projects */
  async listMemberIdsByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: projectMembers.projectId, userId: projectMembers.userId })
      .from(projectMembers)
      .where(inArray(projectMembers.projectId, projectIds));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.projectId) ?? [];
      list.push(row.userId);
      map.set(row.projectId, list);
    }
    return map;
  },

  /** Batch: list team IDs for multiple projects */
  async listTeamIdsByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: projectTeams.projectId, teamId: projectTeams.teamId })
      .from(projectTeams)
      .where(inArray(projectTeams.projectId, projectIds));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.projectId) ?? [];
      list.push(row.teamId);
      map.set(row.projectId, list);
    }
    return map;
  },

  /** Batch: list member names for multiple projects. Excludes soft-deleted users. */
  async listMemberNamesByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: projectMembers.projectId, name: users.name })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(inArray(projectMembers.projectId, projectIds), isNull(users.deletedAt)));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.projectId) ?? [];
      list.push(row.name);
      map.set(row.projectId, list);
    }
    return map;
  },

  /** Batch: list team names for multiple projects. Excludes soft-deleted teams. */
  async listTeamNamesByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: projectTeams.projectId, name: teams.name })
      .from(projectTeams)
      .innerJoin(teams, eq(teams.id, projectTeams.teamId))
      .where(and(inArray(projectTeams.projectId, projectIds), isNull(teams.deletedAt)));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      const list = map.get(row.projectId) ?? [];
      list.push(row.name);
      map.set(row.projectId, list);
    }
    return map;
  },

  /** Batch: list repository IDs for multiple projects */
  async listRepositoryIdsByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: repositories.projectId, id: repositories.id })
      .from(repositories)
      .where(and(inArray(repositories.projectId, projectIds), isNull(repositories.deletedAt)));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.projectId) continue;
      const list = map.get(row.projectId) ?? [];
      list.push(row.id);
      map.set(row.projectId, list);
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
    // Owner and manager can see all projects
    if (role === 'owner' || role === 'manager') return null;

    // Direct project membership
    const directRows = await db
      .select({ projectId: projectMembers.projectId })
      .from(projectMembers)
      .innerJoin(projects, eq(projects.id, projectMembers.projectId))
      .where(and(
        eq(projects.workspaceId, workspaceId),
        eq(projectMembers.userId, userId),
        isNull(projects.deletedAt),
      ));

    // Team-based project membership
    const teamRows = await db
      .select({ projectId: projectTeams.projectId })
      .from(projectTeams)
      .innerJoin(projects, eq(projects.id, projectTeams.projectId))
      .innerJoin(teamMembers, eq(teamMembers.teamId, projectTeams.teamId))
      .where(and(
        eq(projects.workspaceId, workspaceId),
        eq(teamMembers.userId, userId),
        isNull(projects.deletedAt),
      ));

    const ids = new Set<string>();
    for (const r of directRows) ids.add(r.projectId);
    for (const r of teamRows) ids.add(r.projectId);
    return [...ids];
  },

  /**
   * Get all members of a project (direct + team-based).
   * @returns Array of { userId, name, email, role, avatarUrl } for all accessible members.
   */
  async getProjectMembers(projectId: string, workspaceId: string) {
    const directMembers = await db
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
      ));

    const teamMemberRows = await db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        role: teamMembers.role,
      })
      .from(teamMembers)
      .innerJoin(users, eq(users.id, teamMembers.userId))
      .innerJoin(projectTeams, eq(projectTeams.teamId, teamMembers.teamId))
      .innerJoin(projects, eq(projects.id, projectTeams.projectId))
      .where(and(
        eq(projectTeams.projectId, projectId),
        eq(projects.workspaceId, workspaceId),
      ));

    // Deduplicate: direct membership takes precedence
    const seen = new Set<string>();
    const result: typeof directMembers = [];
    for (const m of directMembers) {
      seen.add(m.userId);
      result.push(m);
    }
    for (const m of teamMemberRows) {
      if (!seen.has(m.userId)) {
        seen.add(m.userId);
        result.push(m);
      }
    }
    return result;
  },

  /** Batch: list repository names for multiple projects (display purposes) */
  async listRepositoryNamesByProjectIds(projectIds: string[]): Promise<Map<string, string[]>> {
    if (projectIds.length === 0) return new Map();
    const rows = await db
      .select({ projectId: repositories.projectId, name: repositories.name })
      .from(repositories)
      .where(and(inArray(repositories.projectId, projectIds), isNull(repositories.deletedAt)));
    const map = new Map<string, string[]>();
    for (const row of rows) {
      if (!row.projectId) continue;
      const list = map.get(row.projectId) ?? [];
      list.push(row.name);
      map.set(row.projectId, list);
    }
    return map;
  },
};

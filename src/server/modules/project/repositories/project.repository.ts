import { eq, and, isNull } from 'drizzle-orm';
import {
  REPOSITORY_CONNECTION_TYPES,
  type RepositoryConnectionType,
} from '../constants';
import { db } from '@/server/db/client';
import { projects } from '@drizzle/schema/projects';


type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const projectRepository = {
  /** List all projects for a workspace (with soft delete filter) */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(projects)
      .where(and(eq(projects.workspace_id, workspaceId), isNull(projects.deleted_at)));
  },

  /** Find project by ID */
  async findById(id: string) {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deleted_at)))
      .limit(1);
    return project ?? null;
  },

  /** Find a repository by ID and ensure it belongs to the given workspace (for policy attachment) */
  async findRepositoryByIdAndWorkspace(repositoryId: string, workspaceId: string) {
    const { repositories } = await import('@drizzle/schema/source-controls');
    const { projects } = await import('@drizzle/schema/projects');

    const [result] = await db
      .select({
        repository: repositories,
        project: projects,
      })
      .from(repositories)
      .innerJoin(projects, eq(projects.id, repositories.project_id))
      .where(and(
        eq(repositories.id, repositoryId),
        eq(projects.workspace_id, workspaceId),
        isNull(repositories.deleted_at)
      ))
      .limit(1);

    return result ?? null;
  },

  /** Get the workspaceId that owns a given repository (useful for attach policy when workspaceId not provided) */
  async getWorkspaceIdByRepositoryId(repositoryId: string) {
    const { repositories } = await import('@drizzle/schema/source-controls');
    const { projects } = await import('@drizzle/schema/projects');

    const [result] = await db
      .select({
        workspace_id: projects.workspace_id,
      })
      .from(repositories)
      .innerJoin(projects, eq(projects.id, repositories.project_id))
      .where(and(
        eq(repositories.id, repositoryId),
        isNull(repositories.deleted_at)
      ))
      .limit(1);

    return result?.workspace_id ?? null;
  },

  /** Find project by slug within a workspace */
  async findBySlug(workspaceId: string, slug: string, tx?: Tx) {
    const executor = tx ?? db;
    const [project] = await executor
      .select()
      .from(projects)
      .where(and(eq(projects.workspace_id, workspaceId), eq(projects.slug, slug), isNull(projects.deleted_at)))
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
        workspace_id: data.workspaceId,
        name: data.name,
        slug: data.slug,
        description: data.description,
        platform: data.platform,
        language: data.language,
        avatar_url: data.avatarUrl,
        created_by: data.createdBy,
        updated_by: data.createdBy,
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
        avatar_url: data.avatarUrl,
        updated_by: data.updatedBy,
        updated_at: new Date(),
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
        deleted_at: new Date(),
        deleted_by: deletedBy,
      })
      .where(eq(projects.id, id))
      .returning();
    return project;
  },

  /** List repositories belonging to this project (both 'scm' and 'external') */
  async listRepositories(projectId: string) {
    const { repositories } = await import('@drizzle/schema/source-controls');
    return db
      .select()
      .from(repositories)
      .where(and(eq(repositories.project_id, projectId), isNull(repositories.deleted_at)));
  },

  /** List all repositories across all projects in a workspace */
  async listRepositoriesByWorkspace(workspaceId: string) {
    const { repositories } = await import('@drizzle/schema/source-controls');
    return db
      .select({
        id: repositories.id,
        name: repositories.name,
        url: repositories.url,
        default_branch: repositories.default_branch,
        connection_type: repositories.connection_type,
        project_id: repositories.project_id,
        project_name: projects.name,
        created_at: repositories.created_at,
        last_synced_at: repositories.last_synced_at,
      })
      .from(repositories)
      .innerJoin(projects, eq(projects.id, repositories.project_id))
      .where(and(
        eq(projects.workspace_id, workspaceId),
        isNull(repositories.deleted_at),
        isNull(projects.deleted_at)
      ));
  },

  /**
   * Attach an existing repository (or create new one) to a project.
   *
   * Used by:
   * - External upload flow (auto-creates 'external' repos on first upload)
   * - Future SCM registration flows
   *
   * @param connectionType - Must be one of REPOSITORY_CONNECTION_TYPES
   */
  async attachRepository(
    projectId: string,
    repositoryData: {
      name: string;
      url: string;
      defaultBranch?: string;
      connectionType: RepositoryConnectionType;
      sourceControlId?: string;
      currentPolicyId?: string; // NEW: for attaching scan policy at creation time
    },
    createdBy: string
  ) {
    const { repositories } = await import('@drizzle/schema/source-controls');

    const [repo] = await db
      .insert(repositories)
      .values({
        project_id: projectId,
        name: repositoryData.name,
        url: repositoryData.url,
        default_branch: repositoryData.defaultBranch || 'main',
        connection_type: repositoryData.connectionType,
        source_control_id: repositoryData.sourceControlId,
        current_policy_id: repositoryData.currentPolicyId,
        created_by: createdBy,
        updated_by: createdBy,
      })
      .returning();

    return repo;
  },

  /** Attach / update the current scan policy for a repository (for managed scanning) */
  async setRepositoryPolicy(repositoryId: string, policyId: string | null, updatedBy: string) {
    const { repositories } = await import('@drizzle/schema/source-controls');

    const [updated] = await db
      .update(repositories)
      .set({
        current_policy_id: policyId,
        updated_by: updatedBy,
        updated_at: new Date(),
      })
      .where(eq(repositories.id, repositoryId))
      .returning();

    return updated;
  },

  /** Find external repository by URL under a project (for deduplication on upload) */
  async findExternalRepositoryByUrl(projectId: string, url?: string) {
    if (!url) return null;

    const { repositories } = await import('@drizzle/schema/source-controls');

    const [repo] = await db
      .select()
      .from(repositories)
      .where(and(
        eq(repositories.project_id, projectId),
        eq(repositories.url, url),
        eq(repositories.connection_type, REPOSITORY_CONNECTION_TYPES.EXTERNAL),
        isNull(repositories.deleted_at)
      ))
      .limit(1);

    return repo ?? null;
  },
};

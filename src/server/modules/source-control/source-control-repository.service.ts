import { eq, and, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { sourceControlRepositories, sourceControlImports, repositories } from '@drizzle/schema/source-controls';
import { logger } from '@/server/lib/logger';

type DiscoveredRepo = { name: string; url: string; defaultBranch?: string; externalId?: string; fullName?: string };

export const sourceControlRepositoryService = {
  async listByConnectionId(connectionId: string) {
    logger.sourceControl.info('listByConnectionId', { connectionId });

    // Backfill externalId for existing repos (one-time migration)
    await this.backfillExternalId(connectionId);

    const rows = await db
      .select()
      .from(sourceControlRepositories)
      .where(and(
        eq(sourceControlRepositories.sourceControlId, connectionId),
        isNull(sourceControlRepositories.deletedAt),
      ));
    logger.sourceControl.info('listByConnectionId completed', { count: rows.length });
    return rows;
  },

  /**
   * Backfill externalId from fullName for existing repos.
   * Called once during sync to populate the new column.
   */
  async backfillExternalId(connectionId: string) {
    try {
      await db.execute(sql`
        UPDATE source_control_repositories
        SET external_id = full_name
        WHERE source_control_id = ${connectionId}
          AND external_id IS NULL
      `);
      logger.sourceControl.info('backfillExternalId completed', { connectionId });
    } catch (e) {
      logger.sourceControl.error('backfillExternalId failed', { connectionId, error: e instanceof Error ? e.message : String(e) });
    }
  },

  /**
   * Upsert discovered repos matching by externalId (stable provider ID).
   * Handles: new repos, renames (name/url changed), deletions (orphan soft-delete).
   */
  async upsertMany(connectionId: string, workspaceId: string, repos: DiscoveredRepo[]) {
    logger.sourceControl.info('upsertMany', { connectionId, count: repos.length });

    // Backfill externalId for existing repos (one-time migration)
    await this.backfillExternalId(connectionId);

    // Get existing non-deleted repos for this connection
    const existing = await db
      .select()
      .from(sourceControlRepositories)
      .where(and(
        eq(sourceControlRepositories.sourceControlId, connectionId),
        isNull(sourceControlRepositories.deletedAt),
      ));

    // Build maps for lookup
    const existingByExternalId = new Map(
      existing.filter(r => r.externalId).map(r => [r.externalId!, r])
    );
    const existingByName = new Map(existing.map(r => [r.name, r]));
    const incomingExternalIds = new Set(repos.map(r => r.externalId).filter(Boolean));
    const incomingNames = new Set(repos.map(r => r.name));

    // Process each discovered repo
    for (const repo of repos) {
      const extId = repo.externalId || repo.fullName || repo.name;

      // Try to find existing by externalId first, then by name
      let existingRow = existingByExternalId.get(extId);
      if (!existingRow) {
        existingRow = existingByName.get(repo.name);
      }

      if (existingRow) {
        // REUSE: Update if name or URL changed (rename detection)
        const nameChanged = existingRow.name !== repo.name;
        const urlChanged = existingRow.url !== repo.url;
        const extIdMissing = !existingRow.externalId;

        if (nameChanged || urlChanged || extIdMissing) {
          await db
            .update(sourceControlRepositories)
            .set({
              externalId: extId,
              name: repo.name,
              fullName: repo.fullName,
              url: repo.url,
              defaultBranch: repo.defaultBranch,
              syncedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(sourceControlRepositories.id, existingRow.id));

          // Update linked repositories table if imported
          if (nameChanged || urlChanged) {
            await updateLinkedRepository(existingRow.id, repo);
          }

          logger.sourceControl.info('upsertMany: updated repo', {
            id: existingRow.id,
            name: repo.name,
            nameChanged,
            urlChanged,
          });
        } else {
          // Just update syncedAt
          await db
            .update(sourceControlRepositories)
            .set({ syncedAt: new Date() })
            .where(eq(sourceControlRepositories.id, existingRow.id));
        }
      } else {
        // NEW: Insert new repo
        await db.insert(sourceControlRepositories).values({
          sourceControlId: connectionId,
          workspaceId,
          externalId: extId,
          name: repo.name,
          fullName: repo.fullName || repo.name,
          url: repo.url,
          defaultBranch: repo.defaultBranch,
        });

        logger.sourceControl.info('upsertMany: inserted new repo', { name: repo.name });
      }
    }

    // Handle deletions: repos in DB but not in incoming list
    const staleRepos = existing.filter(r => {
      const extId = r.externalId || r.name;
      return !incomingExternalIds.has(extId) && !incomingNames.has(r.name);
    });

    for (const stale of staleRepos) {
      // Soft-delete: set deletedAt on the repo
      await db
        .update(sourceControlRepositories)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(sourceControlRepositories.id, stale.id));
      logger.sourceControl.info('upsertMany: soft-deleted stale repo', { id: stale.id, name: stale.name });
    }

    logger.sourceControl.info('upsertMany completed', { connectionId });
  },

  async deleteByConnectionId(connectionId: string) {
    logger.sourceControl.info('deleteByConnectionId', { connectionId });
    // Soft-delete all repos for this connection
    await db
      .update(sourceControlRepositories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(sourceControlRepositories.sourceControlId, connectionId));
    logger.sourceControl.info('deleteByConnectionId completed', { connectionId });
  },
};

/**
 * Update linked repositories table when a source repo is renamed.
 */
async function updateLinkedRepository(sourceControlRepoId: string, newData: DiscoveredRepo) {
  // Find import for this source_control_repositories row
  const [importRecord] = await db
    .select()
    .from(sourceControlImports)
    .where(and(
      eq(sourceControlImports.sourceControlRepositoryId, sourceControlRepoId),
      isNull(sourceControlImports.uninstalledAt),
    ))
    .limit(1);

  if (!importRecord?.repositoryId) return;

  // Update the local repositories table
  await db
    .update(repositories)
    .set({
      name: newData.fullName,
      url: newData.url,
      defaultBranch: newData.defaultBranch,
      updatedAt: new Date(),
    })
    .where(eq(repositories.id, importRecord.repositoryId));

  logger.sourceControl.info('updateLinkedRepository', {
    repositoryId: importRecord.repositoryId,
    newName: newData.fullName,
  });
}

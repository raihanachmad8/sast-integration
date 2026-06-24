/**
 * Background job: Sync SCM repository catalog.
 *
 * Runs periodically to:
 * 1. Refresh expired tokens (proactive, before 401)
 * 2. Discover repos from provider API
 * 3. Upsert catalog (match by externalId, detect renames)
 * 4. Clean up orphaned imports (repos deleted from provider)
 * 5. Update lastSyncedAt timestamp
 *
 * Only processes SCM-connected repos (connection_type: 'scm').
 * External repos (CI/CD) are excluded — they use project API keys.
 *
 * @module queue/jobs/sync-source-control
 */

import type { Job } from 'pg-boss';
import { logger } from '@/server/lib/logger';
import { db } from '@/server/db/client';
import { sourceControlImports, repositories } from '@drizzle/schema/source-controls';
import { eq, isNull, and, sql, inArray } from 'drizzle-orm';
import { sourceControlRepository } from '@/server/modules/source-control/source-control.repository';

interface SyncSourceControlJobData {
  sourceControlId?: string; // If provided, sync only this connection
}

export async function processSyncSourceControlJob(job: Job<SyncSourceControlJobData>) {
  const { sourceControlId } = job.data;
  logger.queue.info('processSyncSourceControlJob started', { sourceControlId });

  try {
    // Get connections to sync
    const allConnections = await sourceControlRepository.listAll();
    const connections = sourceControlId
      ? allConnections.filter((c) => c.id === sourceControlId).slice(0, 1)
      : allConnections;

    if (connections.length === 0) {
      logger.queue.info('No source control connections to sync');
      return;
    }

    const { sourceControlService } = await import('../../source-control/source-control.service');

    for (const connection of connections) {
      try {
        logger.queue.info('Syncing connection', { id: connection.id, provider: connection.provider, name: connection.name });

        // Sync the connection
        const result = await sourceControlService.sync(connection.id, connection.workspaceId);

        // Update lastSyncedAt
        await sourceControlRepository.update(connection.id, { lastSyncedAt: new Date() });

        // Clean up orphaned imports
        await cleanupOrphanedImports(connection.id);

        logger.queue.info('Sync completed', {
          id: connection.id,
          discovered: result.discovered,
        });
      } catch (e) {
        logger.queue.error('Sync failed for connection', {
          id: connection.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    logger.queue.info('processSyncSourceControlJob completed', { connections: connections.length });
  } catch (error) {
    logger.queue.error('processSyncSourceControlJob failed', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Clean up orphaned imports: repos deleted from provider but import still exists.
 * Marks local repository as deleted and import as uninstalled.
 */
async function cleanupOrphanedImports(sourceControlId: string) {
  // Find imports where the linked source_control_repositories is marked as deleted
  const orphanedImports = await db
    .select({
      importId: sourceControlImports.id,
      repositoryId: sourceControlImports.repositoryId,
    })
    .from(sourceControlImports)
    .where(and(
      eq(sourceControlImports.sourceControlId, sourceControlId),
      isNull(sourceControlImports.uninstalledAt),
      sql`EXISTS (
        SELECT 1 FROM source_control_repositories SCR
        WHERE SCR.id = ${sourceControlImports.sourceControlRepositoryId}
        AND SCR.name LIKE '[deleted]%'
      )`,
    ));

  if (orphanedImports.length === 0) return;

  const now = new Date();

  // Batch soft-delete local repositories
  const repoIds = orphanedImports
    .map((o) => o.repositoryId)
    .filter((id): id is string => id !== null);
  if (repoIds.length > 0) {
    await db
      .update(repositories)
      .set({ deletedAt: now, deletedBy: null })
      .where(inArray(repositories.id, repoIds));
  }

  // Batch mark imports as uninstalled
  const importIds = orphanedImports.map((o) => o.importId);
  await db
    .update(sourceControlImports)
    .set({ uninstalledAt: now })
    .where(inArray(sourceControlImports.id, importIds));

  logger.queue.info('Cleaned up orphaned imports', { count: orphanedImports.length });
}

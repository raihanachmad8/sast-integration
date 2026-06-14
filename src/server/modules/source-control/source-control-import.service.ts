import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { createWebhook, deleteWebhook } from './webhook-provisioner';
import { toCredentials } from './helpers';
import crypto from 'crypto';
import { sourceControlImportRepository } from './source-control-import.repository';
import { db } from '@/server/db/client';
import { repositories } from '@drizzle/schema/source-controls';
import { eq } from 'drizzle-orm';

interface ImportInput {
  connectionId: string;
  sourceRepositoryId: string;
  projectId?: string;
}

export const sourceControlImportService = {
  async import(userId: string, workspaceId: string, input: ImportInput) {
    logger.sourceControl.info('import', { userId, connectionId: input.connectionId, sourceRepositoryId: input.sourceRepositoryId });

    // 1. Validate connection exists
    const connection = await sourceControlImportRepository.findConnectionById(input.connectionId);
    if (!connection) {
      throw new AppError('Source control connection not found', 404, 'NOT_FOUND');
    }

    // 2. Validate source repo exists
    const sourceRepo = await sourceControlImportRepository.findSourceRepoById(input.sourceRepositoryId);
    if (!sourceRepo) {
      throw new AppError('Source repository not found', 404, 'NOT_FOUND');
    }

    // 3. Check for active import (already imported)
    const existingImport = await sourceControlImportRepository.findActiveImportBySourceRepoId(input.sourceRepositoryId);
    if (existingImport) {
      throw new AppError('Repository already imported', 409, 'CONFLICT');
    }

    // 4. Check for stale repo (soft-deleted or existing by name) — restore or create new
    let repo;
    const staleRepo = await sourceControlImportRepository.findByNameAndWorkspace(sourceRepo.fullName, workspaceId);

    if (staleRepo) {
      if (staleRepo.deletedAt) {
        // Restore soft-deleted repo
        await sourceControlImportRepository.restoreRepository(staleRepo.id, userId);
        // Update with latest data
        await db.update(repositories).set({
          url: sourceRepo.url || `https://${sourceRepo.fullName}`,
          defaultBranch: sourceRepo.defaultBranch ?? 'main',
          projectId: input.projectId ?? staleRepo.projectId,
          updatedAt: new Date(),
          updatedBy: userId,
        }).where(eq(repositories.id, staleRepo.id));
        repo = { ...staleRepo, deletedAt: null, url: sourceRepo.url || staleRepo.url };
        logger.sourceControl.info('import — restored soft-deleted repository', { repoId: repo.id, name: sourceRepo.fullName });
      } else {
        // Repo exists and is active — reuse it
        repo = staleRepo;
        logger.sourceControl.info('import — reusing existing repository', { repoId: repo.id, name: sourceRepo.fullName });
      }
    } else {
      // 5. Create local repository record (new)
      repo = await sourceControlImportRepository.createRepository({
        workspaceId: workspaceId,
        projectId: input.projectId ?? null,
        name: sourceRepo.fullName,
        url: sourceRepo.url || `https://${sourceRepo.fullName}`,
        defaultBranch: sourceRepo.defaultBranch ?? 'main',
        connectionType: 'scm',
        importMode: 'imported',
        createdBy: userId,
      });
    }

    // 6. Provision webhook on provider
    let webhookResult: { webhookId: string; webhookSecret: string } | null = null;
    const credentials = toCredentials(connection.credentials);
    const webhookSecret = crypto.randomBytes(32).toString('hex');
    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const webhookUrl = `${appBaseUrl}/api/v1/source-control/webhooks/${connection.provider}`;

    try {
      webhookResult = await createWebhook(connection.provider, credentials, sourceRepo.fullName, webhookUrl, webhookSecret);
    } catch (e) {
      logger.sourceControl.error('import — webhook provisioning failed', { error: e instanceof Error ? e.message : e });
      // Rollback: delete the repo if we created it
      if (!staleRepo) {
        await sourceControlImportRepository.deleteRepositoryById(repo.id);
      }
      throw new AppError('Failed to provision webhook', 500, 'WEBHOOK_PROVISION_FAILED');
    }

    // 7. Create import record
    const importRecord = await sourceControlImportRepository.createImport({
      workspaceId: workspaceId,
      sourceControlId: input.connectionId,
      sourceControlRepositoryId: input.sourceRepositoryId,
      repositoryId: repo.id,
      webhookExternalId: webhookResult?.webhookId ?? null,
      webhookSecret: webhookResult?.webhookSecret ?? webhookSecret,
      webhookStatus: webhookResult ? 'active' : 'failed',
      importedBy: userId,
      importedAt: new Date(),
    });

    logger.sourceControl.info('import completed', { importId: importRecord.id, repoId: repo.id });
    return { import: importRecord, repository: repo };
  },

  async uninstall(userId: string, importId: string) {
    logger.sourceControl.info('uninstall', { userId, importId });

    // 1. Load import record
    const importRecord = await sourceControlImportRepository.findImportById(importId);
    if (!importRecord) {
      throw new AppError('Import record not found', 404, 'NOT_FOUND');
    }

    if (importRecord.uninstalledAt) {
      throw new AppError('Repository already uninstalled', 409, 'CONFLICT');
    }

    // 2. Revoke webhook from provider
    if (importRecord.webhookExternalId && importRecord.repositoryId) {
      const repo = await sourceControlImportRepository.findRepositoryById(importRecord.repositoryId);
      const connection = await sourceControlImportRepository.findConnectionById(importRecord.sourceControlId);

      if (repo && connection) {
        const credentials = toCredentials(connection.credentials);
        try {
          await deleteWebhook(connection.provider, credentials, repo.name, importRecord.webhookExternalId);
        } catch (e) {
          logger.sourceControl.error('uninstall — webhook deletion failed (continuing)', { error: e instanceof Error ? e.message : e });
        }
      }
    }

    // 3. Soft-delete the local repository
    if (importRecord.repositoryId) {
      await sourceControlImportRepository.softDeleteRepository(importRecord.repositoryId, userId);
    }

    // 4. Mark import as uninstalled
    await sourceControlImportRepository.markImportUninstalled(importId);

    logger.sourceControl.info('uninstall completed', { importId });
    return { removed: true, repositoryId: importRecord.repositoryId };
  },

  async uninstallByConnectionId(userId: string, connectionId: string) {
    logger.sourceControl.info('uninstallByConnectionId', { userId, connectionId });

    const imports = await sourceControlImportRepository.findActiveImportsByConnectionId(connectionId);

    for (const imp of imports) {
      try {
        await this.uninstall(userId, imp.id);
      } catch (e) {
        logger.sourceControl.error('uninstallByConnectionId — failed for import', { importId: imp.id, error: e instanceof Error ? e.message : e });
      }
    }

    logger.sourceControl.info('uninstallByConnectionId completed', { connectionId, count: imports.length });
  },
};

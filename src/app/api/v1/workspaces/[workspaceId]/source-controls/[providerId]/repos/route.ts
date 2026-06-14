import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { sourceControlRepositoryService } from '@/server/modules/source-control/source-control-repository.service';
import { db } from '@/server/db/client';
import { sourceControlImports } from '@drizzle/schema/source-controls';
import { eq, and, isNull } from 'drizzle-orm';

type RouteContext = { params: Promise<{ workspaceId: string; providerId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/source-controls/:providerId/repos
 * List discovered repositories from a source control provider with import status.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, providerId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const discoveredRepos = await sourceControlRepositoryService.listByConnectionId(providerId);

    // Check which repos are imported
    const repoIds = discoveredRepos.map((r) => r.id);
    const imports = repoIds.length > 0
      ? await db
          .select()
          .from(sourceControlImports)
          .where(and(
            eq(sourceControlImports.sourceControlId, providerId),
            isNull(sourceControlImports.uninstalledAt),
          ))
      : [];

    const importMap = new Map(imports.map((i) => [i.sourceControlRepositoryId, i]));

    const repos = discoveredRepos.map((repo) => {
      const importRecord = importMap.get(repo.id);
      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.fullName,
        url: repo.url,
        branch: repo.defaultBranch,
        visibility: repo.visibility,
        externalId: repo.externalId,
        imported: !!importRecord,
        importId: importRecord?.id ?? null,
        repositoryId: importRecord?.repositoryId ?? null,
        webhookStatus: importRecord?.webhookStatus ?? null,
      };
    });

    return ApiResponse.paginated('Repositories retrieved', repos, {
      page: 1,
      perPage: repos.length || 10,
      total: repos.length,
      totalPages: 1,
    });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

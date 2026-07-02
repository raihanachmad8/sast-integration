import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { findingListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { findingsService, FINDING } from '@/server/modules/findings';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;

    logger.finding.info('list', { workspaceId });
    const auth = await authenticate(request);
    if (!auth.success) {
      logger.finding.warn('list unauthorized');
      return auth.response;
    }

    const workspace = await requirePermission(
      withWorkspaceId(request, workspaceId),
      auth.context,
      PERMISSION.FINDING_VIEW,
    );
    if (!workspace.success) {
      logger.finding.warn('list forbidden', { workspaceId, userId: auth.context.userId });
      return workspace.response;
    }

    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const query = findingListQuerySchema.parse(rawParams);

    const result = await findingsService.list(workspaceId, {
      page: query.page,
      perPage: query.perPage,
      search: query.search,
      scanId: query.scanId,
      status: query.status,
      severity: query.severity,
      projectId: query.projectId,
      repositoryId: query.repositoryId,
      sort: query.sort,
      order: query.order,
      onlyNew: query.onlyNew,
    }, auth.context.userId);

    logger.finding.info('list completed', { count: result.data.length, total: result.total });

    return ApiResponse.paginated(FINDING.MESSAGES.FINDINGS_LIST, result.data, {
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      lastPage: result.lastPage,
    });
  } catch (error) {
    logger.finding.error('list failed', { error: error instanceof Error ? error.message : String(error) });

    if (error instanceof Error && error.name === 'ZodError') {
      return ApiResponse.error('Invalid query parameters', 'VALIDATION_ERROR', error.message, 422);
    }

    return ApiResponse.error('Failed to list findings', 'INTERNAL_ERROR', undefined, 500);
  }
}

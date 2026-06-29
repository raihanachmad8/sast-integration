import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { findingListQuerySchema, bulkUpdateStatusSchema, bulkAssignSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
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
    });

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;

    logger.finding.info('bulk update status', { workspaceId });
    const auth = await authenticate(request);
    if (!auth.success) {
      logger.finding.warn('bulk update status unauthorized');
      return auth.response;
    }

    const workspace = await requirePermission(
      withWorkspaceId(request, workspaceId),
      auth.context,
      PERMISSION.FINDING_TRIAGE,
    );
    if (!workspace.success) {
      logger.finding.warn('bulk update status forbidden', { workspaceId, userId: auth.context.userId });
      return workspace.response;
    }

    const bodyResult = await validateBody(request, bulkUpdateStatusSchema);
    if (bodyResult.success === false) return bodyResult.response;

    const result = await findingsService.bulkUpdate(
      workspaceId,
      bodyResult.data.findingIds,
      { status: bodyResult.data.status },
      auth.context.userId,
    );

    logger.finding.info('bulk update status completed', { count: result.length });

    return ApiResponse.success(FINDING.MESSAGES.BULK_STATUS_UPDATED, result);
  } catch (error) {
    logger.finding.error('bulk update status failed', { error: error instanceof Error ? error.message : String(error) });

    return ApiResponse.error('Failed to update findings status', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> },
) {
  try {
    const { workspaceId } = await params;

    logger.finding.info('bulk assign', { workspaceId });
    const auth = await authenticate(request);
    if (!auth.success) {
      logger.finding.warn('bulk assign unauthorized');
      return auth.response;
    }

    const workspace = await requirePermission(
      withWorkspaceId(request, workspaceId),
      auth.context,
      PERMISSION.FINDING_TRIAGE,
    );
    if (!workspace.success) {
      logger.finding.warn('bulk assign forbidden', { workspaceId, userId: auth.context.userId });
      return workspace.response;
    }

    const bodyResult = await validateBody(request, bulkAssignSchema);
    if (bodyResult.success === false) return bodyResult.response;

    const result = await findingsService.bulkUpdate(
      workspaceId,
      bodyResult.data.findingIds,
      { assignedTo: bodyResult.data.userId },
      auth.context.userId,
    );

    logger.finding.info('bulk assign completed', { count: result.length });

    return ApiResponse.success(FINDING.MESSAGES.BULK_ASSIGNED, result);
  } catch (error) {
    logger.finding.error('bulk assign failed', { error: error instanceof Error ? error.message : String(error) });

    return ApiResponse.error('Failed to assign findings', 'INTERNAL_ERROR', undefined, 500);
  }
}

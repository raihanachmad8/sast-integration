import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { bulkActionFindingsSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { findingBulkService } from '@/server/modules/scan/services/finding-bulk.service';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * PUT /api/v1/workspaces/:workspaceId/findings/bulk
 * Unified bulk action endpoint for findings.
 *
 * Body: { ids: string[], action: 'dismiss'|'resolve'|'reverify'|'assign', assignedTo?: string }
 *
 * Routes to the appropriate handler via findingBulkService.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { workspaceId } = await params;
  logger.finding.info('bulk', { workspaceId });

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;

  try {
    const validation = await validateBody(request, bulkActionFindingsSchema);
    if (!validation.success) return validation.response;
    const { ids, action, assignedTo } = validation.data;

    // Permission check based on action type
    const permission = action === 'reverify' ? PERMISSION.FINDING_OVERRIDE_AI : PERMISSION.FINDING_TRIAGE;
    const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, permission);
    if (!workspace.success) return workspace.response;

    const result = await findingBulkService.execute({
      workspaceId,
      ids,
      action,
      assignedTo,
      userId,
    });

    return ApiResponse.success(`${result.action} completed`, result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to execute bulk action', 'INTERNAL_ERROR', undefined, 500);
  }
}

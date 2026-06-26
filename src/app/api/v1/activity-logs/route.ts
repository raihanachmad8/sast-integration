import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { auditRepository } from '@/server/modules/audit/audit.repository';
import { workspaceRepository } from '@/server/modules/workspace/repositories/workspace.repository';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/activity-logs
 * List activity logs for workspaces the user has access to.
 * Requires `audit:read` permission in the active workspace.
 */
export async function GET(request: NextRequest) {
  logger.audit.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const perm = await requirePermission(request, auth.context, PERMISSION.AUDIT_VIEW);
  if (!perm.success) return perm.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    const userWorkspaces = await workspaceRepository.listByUser(auth.context.userId);
    const workspaceIds = userWorkspaces.map((w) => w.id);

    if (workspaceIds.length === 0) {
      return ApiResponse.success('Activity logs retrieved', []);
    }

    const page = Math.floor(offset / limit) + 1;
    const logs = await auditRepository.listActivityLogs(workspaceIds[0], { page, limit });

    return ApiResponse.success('Activity logs retrieved', logs);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get activity logs', 'INTERNAL_ERROR', undefined, 500);
  }
}

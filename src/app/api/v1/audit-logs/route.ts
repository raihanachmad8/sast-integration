import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { db } from '@/server/db/client';
import { auditLogs } from '@drizzle/schema/integrations';
import { workspaceMembers } from '@drizzle/schema/workspaces';
import { desc, eq, inArray } from 'drizzle-orm';

/**
 * GET /api/v1/audit-logs
 * List audit logs for workspaces the user has access to.
 * Requires `audit:read` permission in the active workspace.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const perm = await requirePermission(request, auth.context, PERMISSION.AUDIT_READ);
  if (!perm.success) return perm.response;

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Get workspace IDs the user has access to
    const userWorkspaces = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, auth.context.userId));

    const workspaceIds = userWorkspaces.map((w) => w.workspaceId);

    if (workspaceIds.length === 0) {
      return ApiResponse.success('Audit logs retrieved', []);
    }

    const logs = await db
      .select()
      .from(auditLogs)
      .where(inArray(auditLogs.workspaceId, workspaceIds))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return ApiResponse.success('Audit logs retrieved', logs);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get audit logs', 'INTERNAL_ERROR', undefined, 500);
  }
}

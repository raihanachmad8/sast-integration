import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { memberListQuerySchema } from '@/commons/schemas/member.schema';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { memberService } from '@/server/modules/members';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

/**
 * GET /api/v1/workspaces/:workspaceId/members
 * List workspace members with search, filter, sort, pagination.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.member.info('listMembers');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = memberListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const result = await memberService.list(workspaceId, parsed.data);
    logger.member.info('list completed', { total: result.total });
    return ApiResponse.paginated('Members retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (e) {
    logger.member.error('listMembers failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { inviteMemberSchema, invitationListQuerySchema } from '@/commons/schemas/invitation.schema';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { invitationService } from '@/server/modules/invitations';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

/**
 * GET /api/v1/workspaces/:workspaceId/invitations
 * List pending invitations with search, filter, sort, pagination.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.invitation.info('listInvitations');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = invitationListQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const result = await invitationService.list(workspaceId, parsed.data);
    logger.invitation.info('list completed', { total: result.total });
    return ApiResponse.paginated('Invitations retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
  } catch (e) {
    logger.invitation.error('listInvitations failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.invitation.info('inviteMember');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_INVITE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, inviteMemberSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await invitationService.invite(workspaceId, { email: validation.data.email, role: validation.data.role }, auth.context.userId);
    logger.invitation.info('invite completed');
    return ApiResponse.created('Invitation created', result);
  } catch (e) {
    logger.invitation.error('inviteMember failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

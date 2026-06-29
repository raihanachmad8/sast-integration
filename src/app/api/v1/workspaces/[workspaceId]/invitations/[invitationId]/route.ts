import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { invitationService } from '@/server/modules/invitations';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }) {
  logger.invitation.info('revokeInvitation');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, invitationId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await invitationService.revoke(workspaceId, invitationId, auth.context.userId);
    logger.invitation.info('revoke completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.invitation.error('revokeInvitation failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

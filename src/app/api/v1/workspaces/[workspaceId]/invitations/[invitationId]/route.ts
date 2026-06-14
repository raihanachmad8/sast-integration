import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { memberService } from '@/server/modules/workspace/services/member.service';
import { logger } from '@/server/lib/logger';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }) {
  logger.member.info('revokeInvitation');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, invitationId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await memberService.revokeInvitation(workspaceId, invitationId);
    logger.member.info('revokeInvitation completed');
    return ApiResponse.success('Invitation revoked', { invitationId });
  } catch (e) {
    logger.member.error('revokeInvitation failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

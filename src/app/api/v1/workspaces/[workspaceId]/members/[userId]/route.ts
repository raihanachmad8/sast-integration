import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { changeRoleSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { memberService } from '@/server/modules/members';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; userId: string }> }) {
  logger.member.info('changeRole');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, userId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, changeRoleSchema);
  if (!validation.success) return validation.response;

  try {
    const updated = await memberService.changeRole(workspaceId, userId, validation.data.role, auth.context.userId);
    logger.member.info('changeRole completed');
    return ApiResponse.success('Member role updated', updated);
  } catch (e) {
    logger.member.error('changeRole failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; userId: string }> }) {
  logger.member.info('removeMember');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, userId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await memberService.remove(workspaceId, userId, auth.context.userId);
    logger.member.info('remove completed');
    return ApiResponse.success('Member removed', { userId });
  } catch (e) {
    logger.member.error('removeMember failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

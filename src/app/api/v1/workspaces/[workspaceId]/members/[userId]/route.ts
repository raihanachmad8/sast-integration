import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION, type Role } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { memberService } from '@/server/modules/workspace/services/member.service';
import { changeRoleSchema } from '@/commons/schemas';
import { logger } from '@/server/lib/logger';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; userId: string }> }) {
  logger.member.info('changeRole');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, userId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const raw = await request.json();
    const parsed = changeRoleSchema.safeParse(raw);
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const updated = await memberService.changeRole(workspaceId, userId, parsed.data.role as Role, auth.context.userId);
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
    await memberService.removeMember(workspaceId, userId, auth.context.userId);
    logger.member.info('removeMember completed');
    return ApiResponse.success('Member removed', { userId });
  } catch (e) {
    logger.member.error('removeMember failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

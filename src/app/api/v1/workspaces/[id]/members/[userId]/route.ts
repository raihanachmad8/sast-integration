import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { memberService } from '@/server/modules/workspace/member.service';
import { updateRoleSchema } from '@/server/modules/workspace/schemas';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id, userId } = await params;
  const workspace = await requireWorkspaceRole(withWorkspaceId(request, id), auth.context, ROLE.OWNER);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateRoleSchema);
  if (!validation.success) return validation.response;

  try {
    await memberService.changeRole(id, userId, validation.data.role, auth.context.userId);
    return ApiResponse.success(WORKSPACE.MESSAGES.ROLE_UPDATED, { userId, role: validation.data.role });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id, userId } = await params;
  const workspace = await requireWorkspaceRole(withWorkspaceId(request, id), auth.context, ROLE.MANAGER);
  if (!workspace.success) return workspace.response;

  try {
    await memberService.removeMember(id, userId, auth.context.userId);
    return ApiResponse.success(WORKSPACE.MESSAGES.MEMBER_REMOVED, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

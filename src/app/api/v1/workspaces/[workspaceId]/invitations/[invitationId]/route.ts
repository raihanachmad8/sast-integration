import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { memberService } from '@/server/modules/workspace/services/member.service';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ workspaceId: string; invitationId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, invitationId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    await memberService.revokeInvitation(workspaceId, invitationId);
    return ApiResponse.success('Invitation revoked', { invitationId });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { memberService } from '@/server/modules/workspace/member.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; invitationId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id, invitationId } = await params;
  const workspace = await requireWorkspaceRole(withWorkspaceId(request, id), auth.context, ROLE.MANAGER);
  if (!workspace.success) return workspace.response;

  try {
    await memberService.revokeInvitation(id, invitationId);
    return ApiResponse.success(WORKSPACE.MESSAGES.INVITATION_REVOKED, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

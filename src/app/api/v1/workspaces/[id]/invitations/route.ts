import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { memberService } from '@/server/modules/workspace/member.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { ROLE } from '@/commons/constants/permissions';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const workspace = await requireWorkspaceRole(withWorkspaceId(request, id), auth.context, ROLE.MANAGER);
  if (!workspace.success) return workspace.response;

  const invitations = await memberService.listInvitations(id);
  return ApiResponse.success(WORKSPACE.MESSAGES.INVITATIONS_LIST, invitations);
}

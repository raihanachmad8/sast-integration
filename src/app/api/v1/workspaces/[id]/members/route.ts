import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { memberService } from '@/server/modules/workspace/member.service';
import { WORKSPACE } from '@/server/modules/workspace/constants';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;
  const workspace = await requireWorkspaceRole(withWorkspaceId(request, id), auth.context);
  if (!workspace.success) return workspace.response;

  const members = await memberService.listMembers(id);
  return ApiResponse.success(WORKSPACE.MESSAGES.MEMBERS_LIST, members);
}

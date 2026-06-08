import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION, type Role } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { memberService } from '@/server/modules/workspace/services/member.service';
import { inviteMemberSchema } from '@/commons/schemas';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const invitations = await memberService.listInvitations(workspaceId);
    return ApiResponse.success('Invitations retrieved', invitations);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(request, auth.context, PERMISSION.MEMBER_INVITE);
  if (!workspace.success) return workspace.response;

  try {
    const raw = await request.json();
    const parsed = inviteMemberSchema.safeParse(raw);
    if (!parsed.success) {
      return ApiResponse.error(parsed.error.issues[0].message, 'VALIDATION_ERROR', undefined, 422);
    }

    const invitation = await memberService.inviteMember(workspaceId, parsed.data as { email: string; role: Role }, auth.context.userId);
    return ApiResponse.success('Invitation sent', invitation);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

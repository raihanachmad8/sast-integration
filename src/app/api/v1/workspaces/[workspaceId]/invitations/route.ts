import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { parsePagination, validateBody } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { memberService } from '@/server/modules/workspace/services/member.service';
import { inviteMemberSchema } from '@/commons/schemas/member.schema';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.member.info('listInvitations');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const { page, perPage } = parsePagination(request.nextUrl.searchParams);

    const allInvitations = await memberService.listInvitations(workspaceId);

    let filtered = allInvitations;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((i) => i.email.toLowerCase().includes(q));
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    logger.member.info('listInvitations completed', { total, search });
    return ApiResponse.paginated('Invitations retrieved', paginated, { page, perPage, total, totalPages: Math.ceil(total / perPage) });
  } catch (e) {
    logger.member.error('listInvitations failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.member.info('inviteMember');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_INVITE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, inviteMemberSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await memberService.inviteMember(workspaceId, { email: validation.data.email, role: validation.data.role as 'owner' | 'manager' | 'reviewer' | 'member' }, auth.context.userId);
    logger.member.info('inviteMember completed');
    return ApiResponse.created('Invitation created', result);
  } catch (e) {
    logger.member.error('inviteMember failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { parsePagination } from '@/server/http/validate';
import { memberService } from '@/server/modules/workspace/services/member.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ workspaceId: string }> }) {
  logger.member.info('listMembers');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.MEMBER_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const search = request.nextUrl.searchParams.get('search') ?? undefined;
    const role = request.nextUrl.searchParams.get('role') ?? undefined;
    const { page, perPage } = parsePagination(request.nextUrl.searchParams);

    const allMembers = await memberService.listMembers(workspaceId);

    let filtered = allMembers;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q));
    }
    if (role) {
      filtered = filtered.filter((m) => m.role === role);
    }

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);
    logger.member.info('listMembers completed', { total, search, role });
    return ApiResponse.paginated('Members retrieved', paginated, { page, perPage, total, totalPages: Math.ceil(total / perPage) });
  } catch (e) {
    logger.member.error('listMembers failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

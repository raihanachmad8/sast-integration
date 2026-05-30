import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { inviteSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, inviteSchema);
  if (!validation.success) return validation.response;

  const workspace = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspace.success) return workspace.response;

  try {
    const result = await authService.invite(validation.data, workspace.context.workspaceId, auth.context.userId);
    return ApiResponse.success(AUTH.MESSAGES.INVITE_SENT, { email: result.email });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

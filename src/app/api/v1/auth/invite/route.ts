import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { inviteSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { HTTP } from '@/server/http/constants';

export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, inviteSchema);
  if (!validation.success) return validation.response;

  const workspaceId = request.headers.get(HTTP.HEADERS.WORKSPACE_ID);
  if (!workspaceId) return ApiResponse.error(AUTH.ERRORS.WORKSPACE_REQUIRED, AUTH.ERROR_CODE.AUTH, undefined, 400);

  try {
    const result = await authService.invite(validation.data, workspaceId, auth.context.userId);
    return ApiResponse.success(AUTH.MESSAGES.INVITE_SENT, { email: result.email });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { AUTH } from '@/server/modules/auth/constants';

export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const user = await authRepository.findUserById(auth.context.userId);
  if (!user) return ApiResponse.error(AUTH.ERRORS.USER_NOT_FOUND, AUTH.ERROR_CODE.AUTH, undefined, 401);

  let workspace = null;
  if (user.currentWorkspaceId) {
    workspace = await authRepository.getUserWorkspace(user.id, user.currentWorkspaceId);
  }

  return ApiResponse.success(AUTH.MESSAGES.SESSION_RETRIEVED, {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: !!user.emailVerifiedAt,
      currentWorkspaceId: user.currentWorkspaceId,
    },
    workspace,
  });
}

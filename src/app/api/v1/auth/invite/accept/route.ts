import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { acceptInviteSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, acceptInviteSchema);
  if (!validation.success) return validation.response;

  try {
    const user = await authService.acceptInvite(validation.data);
    return ApiResponse.success(AUTH.MESSAGES.INVITE_ACCEPTED, user);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error(AUTH.ERRORS.INVITE_EXPIRED, AUTH.ERROR_CODE.AUTH, undefined, 400);
  }
}

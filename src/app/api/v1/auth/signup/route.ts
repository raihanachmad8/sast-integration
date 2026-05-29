import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { signupSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, signupSchema);
  if (!validation.success) return validation.response;

  try {
    const user = await authService.signup(validation.data);
    return ApiResponse.success(AUTH.MESSAGES.SIGNUP_SUCCESS, user);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error(AUTH.ERRORS.INVALID_CREDENTIALS, AUTH.ERROR_CODE.AUTH, undefined, 500);
  }
}

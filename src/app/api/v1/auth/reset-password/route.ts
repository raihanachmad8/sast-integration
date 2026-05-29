import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';

const schema = z.object({ token: z.string().min(1), password: z.string().min(8).max(128) });

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, schema);
  if (!validation.success) return validation.response;

  try {
    await authFlowsService.resetPassword(validation.data.token, validation.data.password);
    return ApiResponse.success(MAIL.MESSAGES.RESET_SUCCESS, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  const validation = await validateBody(request, schema);
  if (!validation.success) return validation.response;

  try {
    await authFlowsService.forgotPassword(validation.data.email);
    return ApiResponse.success(MAIL.MESSAGES.RESET_SENT, null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

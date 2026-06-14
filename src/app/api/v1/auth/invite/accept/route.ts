import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { acceptInviteSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest) {
  logger.auth.info('acceptInvite');
  const validation = await validateBody(request, acceptInviteSchema);
  if (!validation.success) return validation.response;

  try {
    const user = await authService.acceptInvite(validation.data);
    logger.auth.info('acceptInvite completed');
    return ApiResponse.success(AUTH.MESSAGES.INVITE_ACCEPTED, user);
  } catch (e) {
    logger.auth.error('acceptInvite failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

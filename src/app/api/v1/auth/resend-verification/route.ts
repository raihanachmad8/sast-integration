import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest) {
  logger.auth.info('resendVerification');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    await authFlowsService.sendVerificationEmail(auth.context.userId);
    logger.auth.info('resendVerification completed');
    return ApiResponse.success(MAIL.MESSAGES.VERIFY_SENT, null);
  } catch (e) {
    logger.auth.error('resendVerification failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

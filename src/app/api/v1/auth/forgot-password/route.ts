import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';
import { logger } from '@/server/lib/logger';
import { rateLimiter } from '@/server/modules/auth/services/rate-limiter';

const schema = z.object({ email: z.string().email() });

export async function POST(request: NextRequest) {
  logger.auth.info('forgotPassword');
  const validation = await validateBody(request, schema);
  if (!validation.success) return validation.response;

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rateLimitKey = `forgot-password:${ip}`;
  const retryAfterMs = rateLimiter.check(rateLimitKey);
  if (retryAfterMs !== null) {
    return ApiResponse.error('Too many requests, try again later', 'RATE_LIMITED', undefined, 429);
  }

  try {
    await authFlowsService.forgotPassword(validation.data.email);
    logger.auth.info('forgotPassword completed');
    return ApiResponse.success(MAIL.MESSAGES.RESET_SENT, null);
  } catch (e) {
    logger.auth.error('forgotPassword failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { passwordResetTokens } from '@drizzle/schema';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';
import { resetPasswordSchema } from '@/commons/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { MAIL } from '@/server/modules/mail/constants';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return ApiResponse.error('Token is required', 'VALIDATION_ERROR', undefined, 422);
  }

  try {
    const [record] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
      )).limit(1);

    if (!record) {
      return ApiResponse.error('Invalid or expired reset link', 'TOKEN_INVALID', undefined, 410);
    }

    return ApiResponse.success('Reset token is valid', { expiresAt: record.expiresAt });
  } catch (e) {
    logger.auth.error('verifyResetToken failed', { error: e instanceof Error ? e.message : e });
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  logger.auth.info('resetPassword');
  const validation = await validateBody(request, resetPasswordSchema);
  if (!validation.success) return validation.response;

  try {
    await authFlowsService.resetPassword(validation.data.token, validation.data.password);
    logger.auth.info('resetPassword completed');
    return ApiResponse.success(MAIL.MESSAGES.RESET_SUCCESS, null);
  } catch (e) {
    logger.auth.error('resetPassword failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

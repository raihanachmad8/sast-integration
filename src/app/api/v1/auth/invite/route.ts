import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { authService } from '@/server/modules/auth/services/auth.service';
import { authRepository } from '@/server/modules/auth/repositories/auth.repository';
import { inviteSchema } from '@/server/modules/auth/schemas/auth.schema';
import { AppError } from '@/server/http/errors';
import { AUTH } from '@/server/modules/auth/constants';
import { requirePermission } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { logger } from '@/server/lib/logger';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return ApiResponse.error('Token is required', 'VALIDATION_ERROR', undefined, 422);
  }

  try {
    const invitation = await authRepository.findInvitationByToken(token);
    if (!invitation) {
      return ApiResponse.error(AUTH.ERRORS.INVITE_EXPIRED, 'INVITE_INVALID', undefined, 410);
    }
    if (invitation.expiresAt < new Date()) {
      return ApiResponse.error(AUTH.ERRORS.INVITE_EXPIRED, 'INVITE_EXPIRED', undefined, 410);
    }
    if (invitation.acceptedAt) {
      return ApiResponse.error(AUTH.ERRORS.INVITE_ALREADY_ACCEPTED, 'INVITE_ACCEPTED', undefined, 410);
    }
    return ApiResponse.success('Invitation is valid', {
      email: invitation.email,
      role: invitation.role,
      workspaceId: invitation.workspaceId,
      expiresAt: invitation.expiresAt,
    });
  } catch (e) {
    logger.auth.error('verifyInvite failed', { error: e instanceof Error ? e.message : e });
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest) {
  logger.auth.info('invite');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const validation = await validateBody(request, inviteSchema);
  if (!validation.success) return validation.response;

  const workspace = await requirePermission(request, auth.context, PERMISSION.MEMBER_INVITE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await authService.invite(validation.data, workspace.context.workspaceId, auth.context.userId);
    logger.auth.info('invite completed');
    return ApiResponse.success(AUTH.MESSAGES.INVITE_SENT, { email: result.email });
  } catch (e) {
    logger.auth.error('invite failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';

import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { invitationService } from '@/server/modules/invitations';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logger.invitation.info('decline');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    await invitationService.decline(id);
    logger.invitation.info('decline completed', { invitationId: id });
    return ApiResponse.success('Invitation declined', null);
  } catch (e) {
    logger.invitation.error('decline failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

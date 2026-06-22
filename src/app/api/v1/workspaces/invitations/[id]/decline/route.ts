import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logger.workspace.info('declineInvitation');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    await workspaceService.declineInvitation(id);
    logger.workspace.info('declineInvitation completed', { invitationId: id });
    return ApiResponse.success('Invitation declined', null);
  } catch (e) {
    logger.workspace.error('declineInvitation failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

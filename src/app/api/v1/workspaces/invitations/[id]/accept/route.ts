import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { AppError } from '@/server/http/errors';
import { WORKSPACE } from '@/server/modules/workspace/constants';
import { logger } from '@/server/lib/logger';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  logger.workspace.info('acceptInvitation');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id } = await params;

  try {
    const result = await workspaceService.acceptInvitation(id, auth.context.userId);
    logger.workspace.info('acceptInvitation completed', { invitationId: id });
    return ApiResponse.success('Invitation accepted', result);
  } catch (e) {
    logger.workspace.error('acceptInvitation failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

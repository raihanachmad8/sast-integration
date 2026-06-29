import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { webhookService } from '@/server/modules/webhooks';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; webhookId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('testWebhook');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, webhookId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const result = await webhookService.testWebhook(workspaceId, webhookId, auth.context.userId);
    logger.webhook.info('testWebhook completed');
    return ApiResponse.success('Test sent', result);
  } catch (e) {
    logger.webhook.error('testWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

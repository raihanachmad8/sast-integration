import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { logger } from '@/server/lib/logger';
import { webhookRepository } from '@/server/modules/webhooks';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; webhookId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('listDeliveries');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, webhookId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const deliveries = await webhookRepository.listDeliveries(webhookId);
    logger.webhook.info('listDeliveries completed', { count: deliveries.length });
    return ApiResponse.success('Deliveries retrieved', deliveries);
  } catch (e) {
    logger.webhook.error('listDeliveries failed', { error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

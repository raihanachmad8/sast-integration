import { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { webhookService } from '@/server/modules/webhooks';
import { createWebhookSchema } from '@/commons/schemas';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('listWebhooks');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const webhooks = await webhookService.listWebhooksByWorkspace(workspaceId);
    logger.webhook.info('listWebhooks completed');
    return ApiResponse.success('Webhooks retrieved', webhooks);
  } catch (e) {
    logger.webhook.error('listWebhooks failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('createWebhook');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, createWebhookSchema);
  if (!validation.success) return validation.response;

  try {
    const webhook = await webhookService.createWebhook(workspaceId, validation.data, auth.context.userId);
    logger.webhook.info('createWebhook completed');
    return ApiResponse.created('Webhook created', webhook);
  } catch (e) {
    logger.webhook.error('createWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: e.issues }, 422);
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { updateWebhookSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { webhookService } from '@/server/modules/webhooks';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string; webhookId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('getWebhook');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, webhookId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const webhook = await webhookService.getWebhookById(webhookId);
    
    // IDOR check: verify the webhook belongs to the workspace
    if (webhook.workspaceId !== workspaceId) {
      return ApiResponse.error('Webhook not found', 'NOT_FOUND', undefined, 404);
    }
    
    logger.webhook.info('getWebhook completed');
    return ApiResponse.success('Webhook retrieved', webhook);
  } catch (e) {
    logger.webhook.error('getWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('updateWebhook');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, webhookId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updateWebhookSchema);
  if (!validation.success) return validation.response;

  try {
    // IDOR check: verify the webhook belongs to the workspace before update
    const existingWebhook = await webhookService.getWebhookById(webhookId);
    if (existingWebhook.workspaceId !== workspaceId) {
      return ApiResponse.error('Webhook not found', 'NOT_FOUND', undefined, 404);
    }

    const webhook = await webhookService.updateWebhook(workspaceId, webhookId, validation.data, auth.context.userId);
    logger.webhook.info('updateWebhook completed');
    return ApiResponse.success('Webhook updated', webhook);
  } catch (e) {
    logger.webhook.error('updateWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('deleteWebhook');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, webhookId } = await params;

  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    // IDOR check: verify the webhook belongs to the workspace before delete
    const existingWebhook = await webhookService.getWebhookById(webhookId);
    if (existingWebhook.workspaceId !== workspaceId) {
      return ApiResponse.error('Webhook not found', 'NOT_FOUND', undefined, 404);
    }

    await webhookService.deleteWebhook(workspaceId, webhookId, auth.context.userId);
    logger.webhook.info('deleteWebhook completed');
    return ApiResponse.noContent();
  } catch (e) {
    logger.webhook.error('deleteWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

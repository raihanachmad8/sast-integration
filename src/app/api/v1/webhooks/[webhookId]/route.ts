import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { webhookService } from '@/server/modules/webhooks/webhook.service';
import { updateWebhookSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';

type Params = { params: Promise<{ webhookId: string }> };

/**
 * GET /api/v1/webhooks/:webhookId
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { webhookId } = await params;
  try {
    const webhook = await webhookService.getWebhookById(webhookId);
    return ApiResponse.success('Webhook retrieved', webhook);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/webhooks/:webhookId
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { webhookId } = await params;
  const validation = await validateBody(request, updateWebhookSchema);
  if (!validation.success) return validation.response;
  try {
    const webhook = await webhookService.updateWebhook(webhookId, validation.data, userId);
    return ApiResponse.success('Webhook updated successfully', webhook);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/webhooks/:webhookId
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const { webhookId } = await params;
  try {
    await webhookService.deleteWebhook(webhookId, userId);
    return ApiResponse.success('Webhook deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

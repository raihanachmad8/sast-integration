import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { webhookService } from '@/server/modules/webhooks/webhook.service';
import { updateWebhookSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; webhookId: string }> };

/**
 * GET /api/v1/workspaces/:id/webhooks/:webhookId
 * Retrieve a single webhook by ID.
 * Any workspace member can view a webhook.
 */
export async function GET(request: NextRequest, { params }: Params) {
   
  console.info('[Webhook] GET - incoming request');

 

  const auth = await authenticate(request);
  if (!auth.success) {
     
    console.error('[Webhook] GET - authentication failed');
    return auth.response;
  }

  const { webhookId } = await params;
   
  console.info(`[Webhook] GET - webhookId=${webhookId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) {
     
    console.error(`[Webhook] GET - workspace role check failed for webhookId=${webhookId}`);
    return workspaceCheck.response;
  }

  try {
    const webhook = await webhookService.getWebhookById(webhookId);
     
    console.debug(`[Webhook] GET - found, name=${webhook.name}`);
     
    return ApiResponse.success('Webhook retrieved', webhook);
  } catch (e) {
    if (e instanceof AppError) {
       
      console.error(`[Webhook] GET - AppError: ${e.message}, code=${e.code}`);
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
     
    console.error('[Webhook] GET - unexpected error', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:id/webhooks/:webhookId
 * Update an existing webhook.
 * Only Manager/Owner can update webhooks.
 */
export async function PUT(request: NextRequest, { params }: Params) {
   
  console.info('[Webhook] UPDATE - incoming request');

 

  const auth = await authenticate(request);
  if (!auth.success) {
     
    console.error('[Webhook] UPDATE - authentication failed');
    return auth.response;
  }

  const userId = getUserId(auth.context);
  if (!userId) {
     
    console.error('[Webhook] UPDATE - no userId in auth context');
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { webhookId } = await params;
   
  console.info(`[Webhook] UPDATE - webhookId=${webhookId}, userId=${userId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) {
     
    console.error(`[Webhook] UPDATE - workspace role check failed for webhookId=${webhookId}`);
    return workspaceCheck.response;
  }

  const validation = await validateBody(request, updateWebhookSchema);
  if (!validation.success) {
     
    console.error('[Webhook] UPDATE - body validation failed');
    return validation.response;
  }

  try {
    const webhook = await webhookService.updateWebhook(webhookId, validation.data, userId);
     
    console.info(`[Webhook] UPDATE - success, webhookId=${webhook.id}`);
     
    return ApiResponse.success('Webhook updated successfully', webhook);
  } catch (e) {
    if (e instanceof AppError) {
       
      console.error(`[Webhook] UPDATE - AppError: ${e.message}, code=${e.code}`);
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
     
    console.error('[Webhook] UPDATE - unexpected error', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/webhooks/:webhookId
 * Soft-delete a webhook.
 * Only Manager/Owner can delete webhooks.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
   
  console.info('[Webhook] DELETE - incoming request');

 

  const auth = await authenticate(request);
  if (!auth.success) {
     
    console.error('[Webhook] DELETE - authentication failed');
    return auth.response;
  }

  const userId = getUserId(auth.context);
  if (!userId) {
     
    console.error('[Webhook] DELETE - no userId in auth context');
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { webhookId } = await params;
   
  console.info(`[Webhook] DELETE - webhookId=${webhookId}, userId=${userId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) {
     
    console.error(`[Webhook] DELETE - workspace role check failed for webhookId=${webhookId}`);
    return workspaceCheck.response;
  }

  try {
    await webhookService.deleteWebhook(webhookId, userId);
     
    console.info(`[Webhook] DELETE - success, webhookId=${webhookId}`);
     
    return ApiResponse.success('Webhook deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
       
      console.error(`[Webhook] DELETE - AppError: ${e.message}, code=${e.code}`);
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
     
    console.error('[Webhook] DELETE - unexpected error', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { webhookService } from '@/server/modules/webhooks/webhook.service';
import { createWebhookSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/webhooks
 * List all webhooks in a workspace.
 * Any workspace member can view webhooks.
 */
export async function GET(request: NextRequest, { params }: Params) {
   
  console.info('[Webhook] LIST - incoming request');

 

  const auth = await authenticate(request);
  if (!auth.success) {
     
    console.error('[Webhook] LIST - authentication failed');
    return auth.response;
  }

  const { id: workspaceId } = await params;
   
  console.info(`[Webhook] LIST - workspaceId=${workspaceId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) {
     
    console.error(`[Webhook] LIST - workspace role check failed for workspaceId=${workspaceId}`);
    return workspaceCheck.response;
  }

  try {
    const webhooks = await webhookService.listWebhooksByWorkspace(workspaceId);
     
    console.debug(`[Webhook] LIST - returning ${webhooks.length} webhooks for workspaceId=${workspaceId}`);
     
    return ApiResponse.success('Webhooks retrieved', webhooks);
  } catch (e) {
    if (e instanceof AppError) {
       
      console.error(`[Webhook] LIST - AppError: ${e.message}, code=${e.code}`);
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
     
    console.error('[Webhook] LIST - unexpected error', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/webhooks
 * Create a new webhook in the workspace.
 * Only Manager/Owner can create webhooks.
 */
export async function POST(request: NextRequest, { params }: Params) {
   
  console.info('[Webhook] CREATE - incoming request');

 

  const auth = await authenticate(request);
  if (!auth.success) {
     
    console.error('[Webhook] CREATE - authentication failed');
    return auth.response;
  }

  const userId = getUserId(auth.context);
  if (!userId) {
     
    console.error('[Webhook] CREATE - no userId in auth context');
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId } = await params;
   
  console.info(`[Webhook] CREATE - workspaceId=${workspaceId}, userId=${userId}`);

 

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) {
     
    console.error(`[Webhook] CREATE - workspace role check failed for workspaceId=${workspaceId}`);
    return workspaceCheck.response;
  }

  const validation = await validateBody(request, createWebhookSchema);
  if (!validation.success) {
     
    console.error('[Webhook] CREATE - body validation failed');
    return validation.response;
  }

  try {
    const webhook = await webhookService.createWebhook(workspaceId, validation.data, userId);
     
    console.info(`[Webhook] CREATE - success, webhookId=${webhook.id}`);
     
    return ApiResponse.success('Webhook created successfully', webhook);
  } catch (e) {
    if (e instanceof AppError) {
       
      console.error(`[Webhook] CREATE - AppError: ${e.message}, code=${e.code}`);
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
     
    console.error('[Webhook] CREATE - unexpected error', e);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

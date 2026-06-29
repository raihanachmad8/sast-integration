import { NextRequest } from 'next/server';
import { ZodError } from 'zod';

import { PERMISSION } from '@/commons/constants/permissions';
import { createWebhookSchema, webhookListQuerySchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { webhookService } from '@/server/modules/webhooks';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.webhook.info('listWebhooks');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WEBHOOK_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const parsed = webhookListQuerySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (!parsed.success) {
      return ApiResponse.error('Invalid query', 'VALIDATION_ERROR', parsed.error.flatten().fieldErrors, 400);
    }
    const { page, perPage, search, sort, order, active } = parsed.data;
    const result = await webhookService.listWebhooksByWorkspace(workspaceId, { page, perPage, search, sort, order, active: active !== undefined ? active === 'true' : undefined });
    return ApiResponse.paginated('Webhooks retrieved', result.data, {
      page: result.page,
      perPage: result.perPage,
      total: result.total,
      lastPage: result.lastPage,
    });
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

  try {
    const result = await validateBody(request, createWebhookSchema);
    if (!result.success) return result.response;

    const webhook = await webhookService.createWebhook(workspaceId, result.data, auth.context.userId);
    return ApiResponse.created('Webhook created', webhook);
  } catch (e) {
    logger.webhook.error('createWebhook failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof ZodError) {
      return ApiResponse.error('Invalid webhook data', 'VALIDATION_ERROR', e.flatten().fieldErrors, 400);
    }
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { updatePrReviewSettingsSchema } from '@/commons/schemas/settings.schema';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { workspaceSettingsService } from '@/server/modules/workspace/services/workspace-settings.service';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/settings/pr-review
 * Get PR review settings for a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('getPrReviewSettings');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const settings = await workspaceSettingsService.getPrReviewSettings(workspaceId);
    return ApiResponse.success('PR review settings retrieved', settings);
  } catch (error) {
    logger.workspace.error('getPrReviewSettings failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/settings/pr-review
 * Update PR review settings for a workspace.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('updatePrReviewSettings');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.POLICY_MANAGE);
  if (!workspace.success) return workspace.response;

  const validation = await validateBody(request, updatePrReviewSettingsSchema);
  if (!validation.success) return validation.response;

  try {
    const settings = await workspaceSettingsService.updatePrReviewSettings(workspaceId, validation.data);
    return ApiResponse.success('PR review settings updated', settings);
  } catch (error) {
    logger.workspace.error('updatePrReviewSettings failed', { error: error instanceof Error ? error.message : error });
    if (error instanceof AppError) return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

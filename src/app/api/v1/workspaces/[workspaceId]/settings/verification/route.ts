import type { NextRequest } from 'next/server';

import { PERMISSION } from '@/commons/constants/permissions';
import { verificationSettingsSchema } from '@/commons/schemas';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { ApiResponse } from '@/server/http/response';
import { validateBody } from '@/server/http/validate';
import { logger } from '@/server/lib/logger';
import { workspaceSettingsRepository } from '@/server/modules/workspace/repositories/workspace-settings.repository';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';

type RouteContext = { params: Promise<{ workspaceId: string }> };

const SETTINGS_KEY = 'verification_settings';

/**
 * GET /api/v1/workspaces/:workspaceId/settings/verification
 * Get verification settings for a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('getVerificationSettings');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.AI_MODEL_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const value = await workspaceSettingsRepository.getByKey(workspaceId, SETTINGS_KEY);
    const settings = value ? JSON.parse(value) : {
      attachKnowledge: true,
      requireConfidence: true,
      allowFallback: true,
      confidenceThreshold: '90',
      timeout: '90',
      cweMismatch: 'warn',
    };

    return ApiResponse.success('Settings retrieved', settings);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get settings', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:workspaceId/settings/verification
 * Update verification settings for a workspace.
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  logger.workspace.info('updateVerificationSettings');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, verificationSettingsSchema);
    if (!validation.success) return validation.response;

    const value = JSON.stringify(validation.data);
    await workspaceSettingsRepository.set(workspaceId, SETTINGS_KEY, value);

    return ApiResponse.success('Settings saved', validation.data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to save settings', 'INTERNAL_ERROR', undefined, 500);
  }
}

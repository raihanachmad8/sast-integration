import { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { db } from '@/server/db/client';
import { workspaceSettings } from '@drizzle/schema/workspaces';
import { eq, and } from 'drizzle-orm';

type RouteContext = { params: Promise<{ workspaceId: string }> };

const SETTINGS_KEY = 'verification_settings';

const verificationSettingsSchema = z.object({
  attachKnowledge: z.boolean().default(true),
  requireConfidence: z.boolean().default(true),
  allowFallback: z.boolean().default(true),
  confidenceThreshold: z.string().default('90'),
  timeout: z.string().default('90'),
  cweMismatch: z.string().default('warn'),
});

/**
 * GET /api/v1/workspaces/:workspaceId/settings/verification
 * Get verification settings for a workspace.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS);
  if (!workspace.success) return workspace.response;

  try {
    const [setting] = await db
      .select()
      .from(workspaceSettings)
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, SETTINGS_KEY)))
      .limit(1);

    const value = setting?.value ? JSON.parse(setting.value) : {
      attachKnowledge: true,
      requireConfidence: true,
      allowFallback: true,
      confidenceThreshold: '90',
      timeout: '90',
      cweMismatch: 'warn',
    };

    return ApiResponse.success('Settings retrieved', value);
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
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.WORKSPACE_SETTINGS);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, verificationSettingsSchema);
    if (!validation.success) return validation.response;

    const [existing] = await db
      .select()
      .from(workspaceSettings)
      .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, SETTINGS_KEY)))
      .limit(1);

    const value = JSON.stringify(validation.data);

    if (existing) {
      await db
        .update(workspaceSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(workspaceSettings.id, existing.id));
    } else {
      await db.insert(workspaceSettings).values({
        workspaceId,
        key: SETTINGS_KEY,
        value,
      });
    }

    return ApiResponse.success('Settings saved', validation.data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to save settings', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { scanProfileService } from '@/server/modules/scan/services/scan-profile.service';
import { updateScanProfileSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; profileId: string }> };

/**
 * GET /api/v1/workspaces/:id/scan-profiles/:profileId
 * Get a single scan profile.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, profileId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const profile = await scanProfileService.getProfileById(profileId);

    // Extra safety: ensure the profile belongs to this workspace
    if (profile.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan profile not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Scan profile retrieved', profile);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:id/scan-profiles/:profileId
 * Update a scan profile.
 * Only Manager/Owner can update.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, profileId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateScanProfileSchema);
  if (!validation.success) return validation.response;

  try {
    // Verify ownership first
    const existing = await scanProfileService.getProfileById(profileId);
    if (existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan profile not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    const updated = await scanProfileService.updateProfile(profileId, validation.data);
    return ApiResponse.success('Scan profile updated successfully', updated);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/scan-profiles/:profileId
 * Delete a scan profile.
 * Only Manager/Owner can delete.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, profileId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    // Verify ownership
    const existing = await scanProfileService.getProfileById(profileId);
    if (existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan profile not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    await scanProfileService.deleteProfile(profileId);
    return ApiResponse.success('Scan profile deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

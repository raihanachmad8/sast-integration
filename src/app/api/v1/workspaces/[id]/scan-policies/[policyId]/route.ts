import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { scanPolicyService } from '@/server/modules/scan/services/scan-policy.service';
import { updateScanPolicySchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string; policyId: string }> };

/**
 * GET /api/v1/workspaces/:id/scan-policies/:policyId
 * Get a single scan policy.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId, policyId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const policy = await scanPolicyService.getPolicyById(policyId);

    // Extra safety: ensure the policy belongs to this workspace
    if (policy.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan policy not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Scan policy retrieved', policy);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * PUT /api/v1/workspaces/:id/scan-policies/:policyId
 * Update a scan policy.
 * Only Manager/Owner can update.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, policyId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, updateScanPolicySchema);
  if (!validation.success) return validation.response;

  try {
    // Verify ownership first
    const existing = await scanPolicyService.getPolicyById(policyId);
    if (existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan policy not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    const updated = await scanPolicyService.updatePolicy(policyId, validation.data);
    return ApiResponse.success('Scan policy updated successfully', updated);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * DELETE /api/v1/workspaces/:id/scan-policies/:policyId
 * Delete a scan policy.
 * Only Manager/Owner can delete.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, policyId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    // Verify ownership
    const existing = await scanPolicyService.getPolicyById(policyId);
    if (existing.workspace_id !== workspaceId) {
      return ApiResponse.error('Scan policy not found in this workspace', 'NOT_FOUND', undefined, 404);
    }

    await scanPolicyService.deletePolicy(policyId);
    return ApiResponse.success('Scan policy deleted successfully', null);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { scanPolicyService } from '@/server/modules/scan/services/scan-policy.service';
import { createScanPolicySchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/workspaces/:id/scan-policies
 * List all scan policies in a workspace.
 * Any workspace member can view policies.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;

  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MEMBER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const policies = await scanPolicyService.listPoliciesByWorkspace(workspaceId);
    return ApiResponse.success('Scan policies retrieved', policies);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * POST /api/v1/workspaces/:id/scan-policies
 * Create a new scan policy in the workspace.
 * Only Manager/Owner can create policies.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId } = await params;

  // Only Manager+ can manage scan policies
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, createScanPolicySchema);
  if (!validation.success) return validation.response;

  try {
    const policy = await scanPolicyService.createPolicy(workspaceId, validation.data);
    return ApiResponse.success('Scan policy created successfully', policy);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { findingService } from '@/server/modules/scan';

type RouteContext = { params: Promise<{ workspaceId: string; findingId: string }> };

/**
 * GET /api/v1/workspaces/:workspaceId/findings/:findingId
 * Get a single finding with AI verifications.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_VIEW);
  if (!workspace.success) return workspace.response;

  try {
    const finding = await findingService.getById(findingId);
    if (!finding) {
      return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
    }
    return ApiResponse.success('Finding retrieved', finding);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to get finding', 'INTERNAL_ERROR', undefined, 500);
  }
}

const updateFindingSchema = z.object({
  status: z.string().optional(),
  assignedTo: z.string().optional(),
});

/**
 * PATCH /api/v1/workspaces/:workspaceId/findings/:findingId
 * Update finding status or assignment.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const { workspaceId, findingId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_TRIAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, updateFindingSchema);
    if (!validation.success) return validation.response;
    const { status, assignedTo } = validation.data;

    let result;
    if (status) {
      result = await findingService.updateStatus(findingId, status, userId);
    } else if (assignedTo !== undefined) {
      result = await findingService.assign(findingId, assignedTo);
    } else {
      return ApiResponse.error('Either status or assignedTo is required', 'VALIDATION_ERROR', undefined, 400);
    }

    return ApiResponse.success('Finding updated', result);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update finding', 'INTERNAL_ERROR', undefined, 500);
  }
}

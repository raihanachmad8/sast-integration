import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { validateBody } from '@/server/http/validate';
import { PERMISSION } from '@/commons/constants/permissions';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';

type RouteContext = { params: Promise<{ workspaceId: string }> };

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one finding ID is required'),
  payload: z.object({
    status: z.string().optional(),
    assignedTo: z.string().optional(),
  }),
});

/**
 * PUT /api/v1/workspaces/:workspaceId/findings/bulk
 * Bulk update findings (status, assignment).
 */
export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = auth.context.userId;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.FINDING_TRIAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, bulkUpdateSchema);
    if (!validation.success) return validation.response;
    const { ids, payload } = validation.data;

    let updated = 0;

    if (payload.status) {
      for (const id of ids) {
        try {
          await findingRepository.updateStatus(id, payload.status, userId);
          updated++;
        } catch {
          // Skip individual failures
        }
      }
    }

    if (payload.assignedTo !== undefined) {
      for (const id of ids) {
        try {
          await findingRepository.updateAssignment(id, payload.assignedTo);
          updated++;
        } catch {
          // Skip individual failures
        }
      }
    }

    return ApiResponse.success('Findings updated', { updated });
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to update findings', 'INTERNAL_ERROR', undefined, 500);
  }
}

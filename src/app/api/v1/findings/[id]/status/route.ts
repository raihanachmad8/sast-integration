import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { findingRepository } from '@/server/modules/scan/repositories/finding.repository';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(['open', 'fixed', 'false_positive', 'ignored']),
});

/**
 * PATCH /api/v1/findings/:id/status
 *
 * Update finding status with history tracking.
 * Valid statuses: open, fixed, false_positive, ignored
 *
 * Records the status change in finding_history for audit trail.
 * Requires workspace membership (MEMBER role minimum).
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id } = await params;

  const validation = await validateBody(request, statusSchema);
  if (!validation.success) return validation.response;

  const finding = await findingRepository.findById(id);
  if (!finding) {
    return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
  }

  const project = await projectRepository.findById(finding.project_id);
  if (!project?.workspace_id) {
    return ApiResponse.error('Finding project not found', 'NOT_FOUND', undefined, 404);
  }

  const workspaceCheck = await requireWorkspaceRole(
    withWorkspaceId(request, project.workspace_id),
    auth.context,
    ROLE.MEMBER
  );
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const result = await findingService.updateStatus(id, validation.data.status, userId);
    return ApiResponse.success('Finding status updated', result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update finding status';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

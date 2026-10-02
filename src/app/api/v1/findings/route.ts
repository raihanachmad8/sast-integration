import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';

/**
 * GET /api/v1/findings
 *
 * List findings for a project with optional filters.
 * Requires workspace membership (MEMBER role minimum).
 *
 * Query Parameters:
 *   - projectId (required): Project UUID
 *   - scanId: Filter by specific scan
 *   - status: Filter by status (open, fixed, false_positive, ignored)
 *   - severity: Filter by severity (critical, high, medium, low, info)
 *   - scanner: Filter by scanner name
 *   - assignedTo: Filter by assigned user UUID
 *   - limit: Maximum results (default 50, max 100)
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return ApiResponse.error('projectId is required', 'VALIDATION_ERROR', undefined, 422);
  }

  const project = await projectRepository.findById(projectId);
  if (!project?.workspace_id) {
    return ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404);
  }

  const workspaceCheck = await requirePermission(
    withWorkspaceId(request, project.workspace_id),
    auth.context,
    PERMISSION.FINDING_VIEW
  );
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const filters = {
      scanId: searchParams.get('scanId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      severity: searchParams.get('severity') ?? undefined,
      scanner: searchParams.get('scanner') ?? undefined,
      assignedTo: searchParams.get('assignedTo') ?? undefined,
    };

    const limitParam = searchParams.get('limit');
    const limit = Math.min(Math.max(Number(limitParam || 50), 1), 100);

    const findings = await findingService.list(projectId, filters, limit);

    return ApiResponse.success('Findings retrieved', { findings });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to list findings';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

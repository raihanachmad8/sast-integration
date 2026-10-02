import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { enqueue } from '@/server/modules/queue/queue.service';
import { SCAN_PARSE_JOB_NAME } from '@/server/modules/scan/constants';

/**
 * POST /api/v1/projects/:projectId/scans/:scanId/reparse
 *
 * Manually triggers re-parsing of all previously uploaded scanner results for a given scan.
 *
 * This is useful after:
 * - Parser logic improvements
 * - Bug fixes in severity mapping or deduplication
 * - Recovery from previous processing failures
 *
 * The endpoint requires workspace membership and will:
 * - Set the scan status to 'processing'
 * - Re-enqueue every scan_result that has a stored file_key
 * - Return how many results were queued for background processing
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string; scanId: string }> }
) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('User authentication required', 'FORBIDDEN', undefined, 403);
  }

  const { projectId, scanId } = await params;

  const project = await projectRepository.findById(projectId);
  if (!project?.workspace_id) {
    return ApiResponse.error('Project not found', 'NOT_FOUND', undefined, 404);
  }

  const wsCheck = await requireWorkspaceRole(
    withWorkspaceId(request, project.workspace_id),
    auth.context,
    ROLE.MEMBER
  );
  if (!wsCheck.success) return wsCheck.response;

  try {
    await scanRepository.updateStatus(scanId, 'processing');

    const scanResults = await scanRepository.listScanResultsByScanId(scanId);

    let queuedCount = 0;

    for (const result of scanResults) {
      if (result.file_key) {
        await enqueue(SCAN_PARSE_JOB_NAME, {
          scanId,
          projectId,
          scanResultId: result.id,
          scanner: result.scanner,
          fileKey: result.file_key,
        });
        queuedCount++;
      }
    }

    return ApiResponse.success('Manual reparse triggered successfully', {
      scanId,
      resultsQueued: queuedCount,
      status: 'processing',
    });
  } catch (error) {
    console.error(`[Reparse] Failed for scanId=${scanId}`, error);
    return ApiResponse.error('Failed to trigger reparse', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { processCleanupOldScanFilesJob } from '@/server/modules/queue/jobs/cleanup-old-scan-files.job';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
import { ROLE } from '@/commons/constants/permissions';

/**
 * POST /api/v1/retention/cleanup
 *
 * Manually triggers the 30-day raw scan file retention cleanup job.
 *
 * Query Parameters:
 *   - dryRun=true   → Simulate only. Returns what would be deleted without touching storage or DB.
 *   - workspaceId=  → Required. The workspace to clean up files for.
 *
 * Security:
 *   - Requires a valid user session (not project API token).
 *   - Only OWNER or MANAGER of the specified workspace can trigger cleanup.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  if (auth.context.type !== 'user_session') {
    return ApiResponse.error('Manual retention cleanup requires a user session (not a project token)', 'FORBIDDEN', undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  if (!workspaceId) {
    return ApiResponse.error('workspaceId query parameter is required', 'VALIDATION_ERROR', undefined, 422);
  }

  const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
  if (!role || (role !== ROLE.OWNER && role !== ROLE.MANAGER)) {
    return ApiResponse.error('Only workspace owners and managers can trigger retention cleanup', 'FORBIDDEN', undefined, 403);
  }

  const dryRun = searchParams.get('dryRun') === 'true' || searchParams.get('dryRun') === '1';

  try {
    const result = await processCleanupOldScanFilesJob({ dryRun });

    return ApiResponse.success(
      dryRun
        ? 'Retention cleanup dry-run completed (no files were deleted)'
        : 'Retention cleanup executed successfully',
      {
        ...result,
        triggeredBy: auth.context.userId,
        triggeredAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('[Retention Cleanup] Manual trigger failed:', error);
    return ApiResponse.error('Failed to run retention cleanup', 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * GET /api/v1/retention/cleanup
 *
 * Convenience alias for dry-run (useful for quick browser/curl inspection).
 * Same authorization rules as POST.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  if (auth.context.type !== 'user_session') {
    return ApiResponse.error('Manual retention cleanup requires a user session', 'FORBIDDEN', undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  if (!workspaceId) {
    return ApiResponse.error('workspaceId query parameter is required', 'VALIDATION_ERROR', undefined, 422);
  }

  const role = await workspaceRepository.getMemberRole(workspaceId, auth.context.userId);
  if (!role || (role !== ROLE.OWNER && role !== ROLE.MANAGER)) {
    return ApiResponse.error('Only workspace owners and managers can trigger retention cleanup', 'FORBIDDEN', undefined, 403);
  }

  try {
    const result = await processCleanupOldScanFilesJob({ dryRun: true });

    return ApiResponse.success('Retention cleanup dry-run (preview only)', {
      ...result,
      triggeredBy: auth.context.userId,
      triggeredAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Retention Cleanup] Dry-run GET failed:', error);
    return ApiResponse.error('Failed to run retention dry-run', 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';
import { AppError } from '@/server/http/errors';
import { managedScanService } from '@/server/modules/scan/services/managed-scan.service';

type Params = { params: Promise<{ id: string; projectId: string; repoId: string }> };

/** Standard 5-field cron pattern: minutes, hours, day-of-month, month, day-of-week */
const CRON_PATTERN = /^[\d\s\*\/\-\,]+$/;

const repositoryScheduleSchema = z.object({
  active: z.boolean(),
  cronExpression: z
    .string()
    .min(5, 'Cron expression must be at least 5 characters')
    .max(100, 'Cron expression must be at most 100 characters')
    .regex(CRON_PATTERN, 'Cron expression contains invalid characters')
    .optional(),
  timezone: z.string().min(1).max(50).optional(),
  branch: z.string().min(1).max(100).optional(),
});

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('Scheduled managed scans require user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id: workspaceId, projectId, repoId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, repositoryScheduleSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await managedScanService.configureRepositorySchedule({
      workspaceId,
      projectId,
      repositoryId: repoId,
      userId,
      active: validation.data.active,
      cronExpression: validation.data.cronExpression,
      timezone: validation.data.timezone,
      branch: validation.data.branch,
    });

    return ApiResponse.success('Repository scan schedule updated', result);
  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

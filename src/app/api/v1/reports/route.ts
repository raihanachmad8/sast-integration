import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { reportService } from '@/server/modules/report/services/report.service';
import { requireWorkspaceRole, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

const generateSchema = z.object({
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  type: z.enum(['ai_verdict_summary', 'detailed_findings', 'executive_summary', 'compliance_export']),
  format: z.enum(['pdf', 'xlsx', 'csv']),
  title: z.string().max(255).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
});

/**
 * POST /api/v1/reports/generate
 *
 * Generate a new report for a project.
 * Requires user authentication.
 */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const validation = await validateBody(request, generateSchema);
  if (!validation.success) return validation.response;

  const workspaceCheck = await requireWorkspaceRole(
    withWorkspaceId(request, validation.data.workspaceId),
    auth.context,
    ROLE.MEMBER
  );
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const report = await reportService.generate({
      ...validation.data,
      createdBy: userId,
    });

    return ApiResponse.success('Report generated', report);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to generate report';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

/**
 * GET /api/v1/reports
 *
 * List reports for a workspace.
 * Requires user authentication.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');

  if (!workspaceId) {
    return ApiResponse.error('workspaceId is required', 'VALIDATION_ERROR', undefined, 422);
  }

  const workspaceCheck = await requireWorkspaceRole(
    withWorkspaceId(request, workspaceId),
    auth.context,
    ROLE.MEMBER
  );
  if (!workspaceCheck.success) return workspaceCheck.response;

  try {
    const reports = await reportService.list(workspaceId);
    return ApiResponse.success('Reports retrieved', { reports });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to list reports';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

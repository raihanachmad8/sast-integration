import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { scanUploadService } from '@/server/modules/scan/upload.service';
import { logger } from '@/server/lib/logger';

const uploadSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  branch: z.string().max(100).optional().default('main'),
  commit: z.string().max(40).optional().default(''),
  source: z.string().max(50).optional().default('ci_upload'),
  repositoryUrl: z.string().url().optional().or(z.literal('')).default(''),
  repositoryName: z.string().max(255).optional().default(''),
});

type RouteContext = { params: Promise<{ workspaceId: string }> };

/**
 * POST /api/v1/workspaces/:workspaceId/scans/upload
 * Upload scan results from CI/CD pipelines.
 * Accepts multipart form data with scanner output files.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);

  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.SCAN_RUN);
  if (!workspace.success) return workspace.response;

  try {
    const formData = await request.formData();

    // Validate form fields with Zod
    const parsed = uploadSchema.safeParse({
      projectId: formData.get('projectId'),
      branch: formData.get('branch'),
      commit: formData.get('commit'),
      source: formData.get('source'),
      repositoryUrl: formData.get('repositoryUrl'),
      repositoryName: formData.get('repositoryName'),
    });

    if (!parsed.success) {
      return ApiResponse.error('Validation failed', 'VALIDATION_ERROR', { fields: parsed.error.issues }, 422);
    }

    const { projectId, branch, commit, source, repositoryUrl, repositoryName } = parsed.data;

    // Extract files from form data
    const files: Array<{ name: string; content: string | Buffer; size: number }> = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof File && key === 'file') {
        const buffer = Buffer.from(await value.arrayBuffer());
        files.push({ name: value.name, content: buffer, size: buffer.length });
      }
    }

    if (files.length === 0) {
      return ApiResponse.error('At least one file is required', 'VALIDATION_ERROR', undefined, 400);
    }

    const result = await scanUploadService.uploadScanResults({
      projectId,
      repositoryUrl,
      repositoryName,
      branch,
      commit,
      files,
      uploadedBy: userId,
      source,
      workspaceId,
    });

    return ApiResponse.success('Scan results uploaded', result);
  } catch (e) {
    logger.scan.error('upload failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Failed to upload scan results', 'INTERNAL_ERROR', undefined, 500);
  }
}

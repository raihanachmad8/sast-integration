import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { scanUploadService } from '@/server/modules/scan/upload.service';
import { AppError } from '@/server/http/errors';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
import { projectApiTokenRepository } from '@/server/modules/project/repositories/project-api-token.repository';
import { SUPPORTED_SCANNERS, type SupportedScanner } from '@/commons/constants/scan';

type Params = { params: Promise<{ projectId: string }> };

/**
 * POST /api/v1/projects/:projectId/scans/upload
 *
 * Endpoint for CI pipelines to upload pre-generated scan results.
 * Supports both authenticated users and project API tokens.
 *
 * Form data expected:
 * - branch
 * - commit
 * - repository_url (optional but recommended)
 * - repository_name (optional)
 * - Multiple files: semgrep, cppcheck, gitleaks, flawfinder, etc.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { projectId } = await params;

  // === Strong authorization for upload (supports both user sessions and project API tokens) ===
  let uploadedBy: string;
  let projectApiTokenId: string | undefined;
  let personalAccessTokenId: string | undefined;

  try {
    const project = await projectRepository.findById(projectId);
    if (!project) {
      // Do not leak project existence to unauthenticated or wrong-token callers in CI logs
      return ApiResponse.error('Project not found or you do not have access', 'NOT_FOUND', undefined, 404);
    }

    const context = auth.context;

    if (context.type === 'project_api_token') {
      // === CI / Pipeline path (the reason this endpoint exists) ===
      if (context.projectId !== projectId) {
        return ApiResponse.error(
          'This API token is not valid for the requested project. Use a token created for this exact project.',
          'FORBIDDEN',
          undefined,
          403
        );
      }

      if (!context.permissions?.includes('scans:upload')) {
        return ApiResponse.error(
          'Project API token does not have the required "scans:upload" permission.',
          'FORBIDDEN',
          undefined,
          403
        );
      }

      // Authoritative re-validation (fast path, project-scoped)
      const validToken = await projectApiTokenRepository.findValidForProject(projectId, extractRawToken(request));
      if (!validToken || validToken.id !== context.tokenId) {
        return ApiResponse.error('Project API token is invalid, expired, or has been revoked.', 'UNAUTHORIZED', undefined, 401);
      }

      // Record usage (non-blocking)
      projectApiTokenRepository.touchLastUsed(validToken.id).catch(() => {});

      uploadedBy = context.createdBy; // the human who created this token
      projectApiTokenId = context.tokenId;

    } else if (context.type === 'user_session') {
      // === Interactive / manual upload by a logged-in user ===
      // User must be at least a member of the project's workspace
      const workspaceRole = await workspaceRepository.getMemberRole(project.workspace_id!, context.userId);
      if (!workspaceRole) {
        return ApiResponse.error(
          'You do not have access to this project. Workspace membership is required to upload scan results.',
          'FORBIDDEN',
          undefined,
          403
        );
      }

      uploadedBy = context.userId;

    } else if (context.type === 'personal_access_token') {
      // Future: support user PATs with abilities check
      // For now treat as not yet supported for this endpoint
      return ApiResponse.error(
        'Personal access tokens are not yet supported for scan uploads. Use a project-scoped API token instead.',
        'FORBIDDEN',
        undefined,
        403
      );
    } else {
      return ApiResponse.error('Unsupported authentication method for this endpoint.', 'UNAUTHORIZED', undefined, 401);
    }
  } catch (e) {
    console.error('[Upload] Authorization error:', e);
    return ApiResponse.error('Failed to authorize upload request', 'INTERNAL_ERROR', undefined, 500);
  }

  // === Parse form data and delegate to service ===
  try {
    const formData = await request.formData();

    const branch = formData.get('branch')?.toString();
    const commit = formData.get('commit')?.toString();
    const repositoryUrl = formData.get('repository_url')?.toString() || undefined;
    const repositoryName = formData.get('repository_name')?.toString() || undefined;
    const source = formData.get('source')?.toString() || 'ci_upload';

    if (!branch || !commit) {
      throw new AppError('branch and commit are required', 400, 'VALIDATION_ERROR');
    }

    const files: Array<{
      scanner: string;
      buffer: Buffer;
      originalName: string;
      contentType?: string;
    }> = [];

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        const scanner = key;
        const arrayBuffer = await value.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        files.push({
          scanner,
          buffer,
          originalName: value.name,
          contentType: value.type,
        });
      }
    }

    if (files.length === 0) {
      throw new AppError('At least one scan result file must be uploaded', 400, 'VALIDATION_ERROR');
    }

    // Validate that all provided scanners are supported (both for external upload and future managed scans)
    const unsupported = files
      .map(f => f.scanner)
      .filter(s => !SUPPORTED_SCANNERS.includes(s as SupportedScanner));

    if (unsupported.length > 0) {
      throw new AppError(
        `Unsupported scanner(s): ${unsupported.join(', ')}. Supported: ${SUPPORTED_SCANNERS.join(', ')}`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const result = await scanUploadService.uploadResults({
      projectId,
      repositoryUrl,
      repositoryName,
      branch,
      commit,
      files,
      uploadedBy,
      source,
      projectApiTokenId,
      personalAccessTokenId,
    });

    return ApiResponse.success('Scan results processed', result);

  } catch (e) {
    if (e instanceof AppError) {
      return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    }

    console.error('[Upload] Unexpected error:', {
      projectId,
      error: e instanceof Error ? e.message : e,
      stack: e instanceof Error ? e.stack : undefined,
    });

    return ApiResponse.error(
      'Failed to process scan upload. Please check your payload and try again.',
      'UPLOAD_FAILED',
      undefined,
      500
    );
  }
}

/** Extract the raw Bearer token value (used for re-validation of project tokens) */
function extractRawToken(request: NextRequest): string {
  const authHeader = request.headers.get('authorization') || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return '';
}

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { auditService } from '@/server/modules/audit';

/**
 * GET /api/v1/auth/audit-log
 * Get audit log entries for the current user.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') ?? '';
    const page = parseInt(searchParams.get('page') ?? '1', 10);
    const limit = parseInt(searchParams.get('per_page') ?? '10', 10);
    const result = await auditService.listLogs(workspaceId, { page, limit });
    return ApiResponse.success('Audit log retrieved', result.data);
  } catch (e) {
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

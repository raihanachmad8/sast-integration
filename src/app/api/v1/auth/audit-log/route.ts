import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { AppError } from '@/server/http/errors';
import { parsePagination } from '@/server/http/validate';
import { auditService } from '@/server/modules/audit';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/auth/audit-log
 * Get audit log entries for the current user.
 */
export async function GET(request: NextRequest) {
  logger.audit.info('auditLog');
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') ?? '';
    const { page, perPage: limit } = parsePagination(searchParams);
    const result = await auditService.listLogs(workspaceId, { page, limit });
    logger.audit.info('auditLog completed');
    return ApiResponse.success('Audit log retrieved', result.data);
  } catch (e) {
    logger.audit.error('auditLog failed', { error: e instanceof Error ? e.message : e });
    if (e instanceof AppError) return ApiResponse.error(e.message, e.code, undefined, e.statusCode);
    return ApiResponse.error('Internal server error', 'INTERNAL_ERROR', undefined, 500);
  }
}

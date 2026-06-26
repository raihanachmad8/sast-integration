import { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { logger } from '@/server/lib/logger';

/**
 * GET /api/v1/auth/audit-log
 * Placeholder — audit log feature not yet implemented.
 */
export async function GET(request: NextRequest) {
  logger.auth.info('get request');

  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  return ApiResponse.success('Audit log not yet implemented', []);
}

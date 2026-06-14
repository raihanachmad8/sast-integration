/**
 * CI/CD Status Update Endpoint
 * 
 * POST /api/v1/ci/status
 * 
 * Updates scan status from CI/CD pipelines.
 * 
 * ## Authentication
 * Uses Project API Token via `Authorization: Bearer sast_p_xxxxx`
 * 
 * ## Request Format (JSON)
 * ```json
 * {
 *   "scanId": "uuid",
 *   "status": "running" | "completed" | "failed",
 *   "message": "Optional message",
 *   "tool": "cppcheck",
 *   "findingsCount": 5
 * }
 * ```
 * 
 * ## Response
 * ```json
 * {
 *   "success": true,
 *   "message": "Status updated"
 * }
 * ```
 */

import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticateCiCd } from '@/server/modules/scan/ci-cd-auth';
import { scanRepository } from '@/server/modules/scan/repositories/scan.repository';
import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { randomUUID } from 'node:crypto';
import { validateBody } from '@/server/http/validate';
import { ciStatusSchema } from '@/commons/schemas/ci.schema';

export async function POST(request: NextRequest) {
  // Authenticate using CI/CD token
  const auth = await authenticateCiCd(request);
  if (!auth.success) return auth.response;

  try {
    const validation = await validateBody(request, ciStatusSchema);
    if (!validation.success) return validation.response;
    const { scanId, status, message, tool, findingsCount } = validation.data;

    logger.scan.info('CI/CD status update', { scanId, status, tool, findingsCount });

    // Update scan status
    await scanRepository.updateStatus(scanId, status);

    // Append progress event
    const eventType = status === 'running' ? 'scanning' : status === 'completed' ? 'completed' : 'failed';
    await scanRepository.appendProgressEvent(scanId, {
      id: randomUUID(),
      type: eventType as 'scanning' | 'completed' | 'failed',
      description: message || `${tool || 'Scan'} ${status}`,
      timestamp: new Date().toISOString(),
      scanner: tool,
    });

    logger.scan.info('CI/CD status updated', { scanId, status });

    return ApiResponse.success('Status updated', { scanId, status });
  } catch (error) {
    logger.scan.error('CI/CD status update failed', { error: (error as Error).message });
    if (error instanceof AppError) {
      return ApiResponse.error(error.message, error.code, undefined, error.statusCode);
    }
    return ApiResponse.error('Failed to update status', 'INTERNAL_ERROR', undefined, 500);
  }
}

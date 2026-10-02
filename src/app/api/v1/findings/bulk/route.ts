import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { findingService } from '@/server/modules/scan/services/finding.service';
import { z } from 'zod';

const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one finding ID is required'),
  payload: z.object({
    status: z.string().optional(),
    assignedTo: z.string().nullable().optional(),
  }),
});

/**
 * PUT /api/v1/findings/bulk
 * Bulk update findings (status, assignment).
 */
export async function PUT(request: NextRequest) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const userId = getUserId(auth.context);
  if (!userId) return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  const validation = await validateBody(request, bulkUpdateSchema);
  if (!validation.success) return validation.response;
  try {
    const { ids, payload } = validation.data;
    let updated = 0;
    for (const id of ids) {
      try {
        if (payload.status) await findingService.updateStatus(id, payload.status, userId);
        if (payload.assignedTo !== undefined) await findingService.assign(id, payload.assignedTo);
        updated++;
      } catch {
        // Skip individual failures in bulk operations
      }
    }
    return ApiResponse.success('Findings updated', { updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to bulk update findings';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { findingService } from '@/server/modules/scan/services/finding.service';

type Params = { params: Promise<{ id: string }> };

const assignSchema = z.object({
  assignedTo: z.string().uuid().nullable(),
});

/**
 * PATCH /api/v1/findings/:id/assign
 *
 * Assign or unassign a finding to a user.
 * Set assignedTo to null to unassign.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id } = await params;

  const validation = await validateBody(request, assignSchema);
  if (!validation.success) return validation.response;

  try {
    const result = await findingService.assign(id, validation.data.assignedTo);
    return ApiResponse.success('Finding assignment updated', result);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to update finding assignment';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

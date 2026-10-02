import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { findingService } from '@/server/modules/scan/services/finding.service';

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/v1/findings/:id
 *
 * Get a single finding by ID with AI verifications.
 * Returns the finding record with group info and all AI verification results.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id } = await params;

  try {
    const finding = await findingService.getById(id);
    if (!finding) {
      return ApiResponse.error('Finding not found', 'NOT_FOUND', undefined, 404);
    }

    return ApiResponse.success('Finding retrieved', finding);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to get finding';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

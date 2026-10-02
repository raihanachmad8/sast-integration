import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate, getUserId } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { aiVerificationService } from '@/server/modules/scan/services/ai-verification.service';

type Params = { params: Promise<{ id: string }> };

const verifySchema = z.object({
  modelId: z.string().uuid(),
});

/**
 * POST /api/v1/findings/:id/verify
 *
 * Trigger AI verification for a single finding.
 * Requires user authentication.
 *
 * The verification is performed synchronously for demo purposes.
 * In production, this would be enqueued as a background job.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const userId = getUserId(auth.context);
  if (!userId) {
    return ApiResponse.error('This action requires user authentication', 'FORBIDDEN', undefined, 403);
  }

  const { id } = await params;

  const validation = await validateBody(request, verifySchema);
  if (!validation.success) return validation.response;

  try {
    const verification = await aiVerificationService.verifyFinding(
      id,
      validation.data.modelId
    );

    return ApiResponse.success('Finding verified by AI', verification);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed to verify finding';
    return ApiResponse.error(message, 'INTERNAL_ERROR', undefined, 500);
  }
}

import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ workspaceId: string }> };

const testEventSchema = z.object({
  eventType: z.string().optional(),
});

/**
 * POST /api/v1/workspaces/:workspaceId/source-controls/test-event
 * Accepts a test webhook event and returns confirmation.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;
  const { workspaceId } = await params;
  const workspace = await requirePermission(withWorkspaceId(request, workspaceId), auth.context, PERMISSION.INTEGRATION_MANAGE);
  if (!workspace.success) return workspace.response;

  try {
    const validation = await validateBody(request, testEventSchema);
    if (!validation.success) return validation.response;
    const eventType = validation.data.eventType ?? 'push';

    logger.sourceControl.info('testEvent received', { workspaceId, eventType });

    return ApiResponse.success('Test event accepted', {
      eventType,
      receivedAt: new Date().toISOString(),
      status: 'accepted',
    });
  } catch {
    return ApiResponse.error('Failed to process test event', 'INTERNAL_ERROR', undefined, 500);
  }
}

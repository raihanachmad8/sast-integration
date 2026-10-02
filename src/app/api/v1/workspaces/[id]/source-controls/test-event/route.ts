import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/server/http/response';
import { authenticate } from '@/server/http/authenticate';
import { validateBody } from '@/server/http/validate';
import { requireWorkspaceRole } from '@/server/modules/workspace/workspace.middleware';
import { ROLE } from '@/commons/constants/permissions';

type Params = { params: Promise<{ id: string }> };

const testEventSchema = z.object({
  eventType: z.enum(['push', 'pull_request']),
});

/**
 * POST /api/v1/workspaces/:id/source-controls/test-event
 * Validates a synthetic SCM event request for UI testing.
 */
export async function POST(request: NextRequest, { params }: Params) {
  const auth = await authenticate(request);
  if (!auth.success) return auth.response;

  const { id: workspaceId } = await params;
  const workspaceCheck = await requireWorkspaceRole(request, auth.context, ROLE.MANAGER);
  if (!workspaceCheck.success) return workspaceCheck.response;

  const validation = await validateBody(request, testEventSchema);
  if (!validation.success) return validation.response;

  return ApiResponse.success('Source control test event accepted', {
    workspaceId,
    eventType: validation.data.eventType,
    accepted: true,
  });
}

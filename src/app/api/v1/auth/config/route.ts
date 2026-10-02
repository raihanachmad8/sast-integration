import type { NextRequest } from 'next/server';
import { ApiResponse } from '@/server/http/response';
import { WORKSPACE_MODE } from '@/server/modules/auth/constants';
import { workspaceService } from '@/server/modules/workspace/workspace.service';
import { authenticate, getUserId } from '@/server/http/authenticate';

/**
 * GET /api/v1/auth/config
 *
 * Public endpoint that returns platform configuration for the login/signup pages.
 * - workspaceMode: 'single' or 'multiple' (from env WORKSPACE_MODE)
 * - workspaces: list of user's workspaces (only if authenticated, otherwise empty)
 */
export async function GET(request: NextRequest) {
  const workspaceMode = process.env.WORKSPACE_MODE || WORKSPACE_MODE.MULTIPLE;

  // Try to get user workspaces if authenticated (optional — don't fail if not)
  let workspaces: Array<{ id: string; name: string; slug: string }> = [];
  const auth = await authenticate(request);
  if (auth.success) {
    const userId = getUserId(auth.context);
    if (userId) {
      try {
        const allWorkspaces = await workspaceService.list(userId);
        workspaces = allWorkspaces.map((w: { id: string; name: string; slug: string | null }) => ({
          id: w.id,
          name: w.name,
          slug: w.slug ?? '',
        }));
      } catch {
        // Ignore — return empty workspaces
      }
    }
  }

  return ApiResponse.success('Config loaded', { workspaceMode, workspaces });
}

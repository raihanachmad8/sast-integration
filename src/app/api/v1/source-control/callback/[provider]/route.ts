import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { sourceControlService } from '@/server/modules/source-control/source-control.service';
import { logger } from '@/server/lib/logger';

type RouteContext = { params: Promise<{ provider: string }> };

/**
 * GET /api/v1/source-control/callback/:provider
 *
 * Handles OAuth/App installation callbacks from GitHub, GitLab, Gitea.
 * Exchanges authorization code for access token and stores it.
 * Redirects back to the app with status.
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { provider } = await params;
  const searchParams = request.nextUrl.searchParams;

  const code = searchParams.get('code');
  const installationId = searchParams.get('installation_id');
  const stateParam = searchParams.get('state');

  logger.sourceControl.info('callback received', { provider, hasCode: !!code, hasInstallationId: !!installationId });

  // Parse state for sourceControlId and returnTo
  let sourceControlId: string | null = null;
  let returnTo: string | null = null;
  let status = 'returned';

  if (stateParam) {
    try {
      const state = new URLSearchParams(stateParam);
      sourceControlId = state.get('sourceControlId');
      returnTo = state.get('returnTo');
    } catch {
      // Invalid state
    }
  }

  if (!sourceControlId) {
    return redirectToApp(request, returnTo, 'error', 'Missing source control ID in callback state');
  }

  try {
    const result = await sourceControlService.finalizeCallback(provider, sourceControlId, {
      code,
      installationId,
      origin: request.nextUrl.origin,
    });

    if (!result) {
      return redirectToApp(request, returnTo, 'error', 'Source control not found or provider mismatch');
    }

    status = code ? 'authorized' : installationId ? 'installed' : 'returned';
    return redirectToApp(request, returnTo, status);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Callback processing failed';
    logger.sourceControl.error('callback failed', { provider, sourceControlId, error: message });
    return redirectToApp(request, returnTo, 'error', message);
  }
}

function redirectToApp(request: NextRequest, returnTo: string | null, status: string, error?: string) {
  const base = request.nextUrl.origin;
  const path = returnTo || '/settings';
  const url = new URL(path, base);
  url.searchParams.set('source-control-status', status);
  if (error) url.searchParams.set('source-control-error', error);
  return NextResponse.redirect(url);
}

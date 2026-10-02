import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sourceControlService } from '@/server/modules/source-controls/source-control.service';

type Params = { params: Promise<{ provider: string }> };

/**
 * GET /api/v1/source-control/callback/:provider
 * Receives provider OAuth/App callbacks and returns the user to Source Control.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { provider } = await params;
  const callbackState = request.nextUrl.searchParams.get('state') ?? '';
  const stateParams = new URLSearchParams(callbackState);
  const returnTo = stateParams.get('returnTo');
  const redirectUrl = new URL(resolveInternalReturnTo(returnTo), request.nextUrl.origin);
  const sourceControlId = stateParams.get('sourceControlId');
  const code = request.nextUrl.searchParams.get('code');
  const installationId = request.nextUrl.searchParams.get('installation_id');

  if (sourceControlId && (code || installationId)) {
    try {
      await sourceControlService.finalizeCallback(provider, sourceControlId, {
        code,
        installationId,
        origin: request.nextUrl.origin,
      });
    } catch (error) {
      redirectUrl.searchParams.set('sourceControlCallback', provider);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'Source control authorization failed');
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.searchParams.set('sourceControlCallback', provider);
  if (request.nextUrl.searchParams.has('code')) {
    redirectUrl.searchParams.set('status', 'authorized');
  } else if (request.nextUrl.searchParams.has('installation_id')) {
    redirectUrl.searchParams.set('status', 'installed');
  } else {
    redirectUrl.searchParams.set('status', 'returned');
  }

  return NextResponse.redirect(redirectUrl);
}

function resolveInternalReturnTo(returnTo: string | null) {
  if (!returnTo || !returnTo.startsWith('/') || returnTo.startsWith('//')) {
    return '/workspaces';
  }
  return returnTo;
}

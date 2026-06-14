import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { ROUTES } from '@/commons/constants';

/**
 * Auth pages — redirect to chooser if already logged in.
 */
const AUTH_PAGES = [
  ROUTES.AUTH.SIGNIN,
  ROUTES.AUTH.SIGNUP,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
];

/**
 * Protected pages — require a valid session.
 * All routes under /workspaces and /[workspace]/* need auth.
 */
function isProtectedPath(pathname: string): boolean {
  if (pathname === ROUTES.CHOOSER) return true;
  if (pathname.startsWith('/docs')) return false;

  // /[slug]/* — workspace pages (dynamic segments)
  // Exclude auth pages, API routes, static files, root
  if (
    pathname !== '/' &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/auth') &&
    !pathname.startsWith('/docs')
  ) {
    return true;
  }

  return false;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}

/**
 * Next.js Proxy — runs at the edge before page rendering.
 *
 * Flow:
 * 1. Public paths (auth pages, docs, API) → pass through
 * 2. Auth pages with valid session → redirect to /workspaces
 * 3. Protected paths without session → redirect to /auth/signin
 * 4. Protected paths with invalid token → clear cookie, redirect to /auth/signin
 * 5. All other → pass through
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  // Static files & Next.js internals
  if (pathname.startsWith('/_next') || /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname)) {
    return NextResponse.next();
  }

  // API routes — authenticated server-side by authenticate()
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Docs — public
  if (pathname.startsWith('/docs')) {
    return NextResponse.next();
  }

  // Root → public landing page (no gate)
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Redirect /security to /profile (server-side)
  if (pathname.includes('/security')) {
    const newPath = pathname.replace('/security', '/profile');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  // Auth pages (signin, signup, forgot-password, reset-password)
  if (isAuthPage(pathname)) {
    // Already logged in → redirect to chooser
    if (refreshToken) {
      try {
        await jwtVerify(refreshToken, getJwtSecret());
        return NextResponse.redirect(new URL(ROUTES.CHOOSER, request.url));
      } catch {
        // Invalid token → clear and let through to auth page
        const response = NextResponse.next();
        response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
        return response;
      }
    }
    return NextResponse.next();
  }

  // Protected paths (workspaces, [workspace]/*)
  if (isProtectedPath(pathname)) {
    if (!refreshToken) {
      return redirectToSignin(request);
    }

    try {
      await jwtVerify(refreshToken, getJwtSecret());
      return NextResponse.next();
    } catch {
      // Invalid/expired token → clear cookie, redirect to signin
      const response = redirectToSignin(request);
      response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
      return response;
    }
  }

  return NextResponse.next();
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((p) => pathname.startsWith(p));
}

function redirectToSignin(request: NextRequest): NextResponse {
  const signinUrl = new URL(ROUTES.AUTH.SIGNIN, request.url);
  signinUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(signinUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * JWT secret for edge verification.
 * Must match the server-side JWT_SECRET env var.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return new TextEncoder().encode(secret);
}

/**
 * Public paths that don't require authentication.
 * API routes are handled separately by the authenticate() function.
 */
const PUBLIC_PATHS = [
  '/auth/signin',
  '/auth/signup',
  '/auth/invite',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-email',
];

/**
 * Next.js middleware — runs at the edge before page rendering.
 *
 * Responsibilities:
 * - Verify refresh token JWT signature (edge-compatible via jose)
 * - Redirect unauthenticated users to /auth/signin
 * - Preserve the original URL for post-login redirect
 * - Allow public paths and API routes through
 *
 * Full session validation (DB lookup) happens server-side via authenticate().
 * This middleware provides fast edge-level JWT signature verification.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow API routes (authenticated by server-side authenticate())
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    /\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check for refresh token cookie
  const refreshToken = request.cookies.get('refresh_token');

  if (!refreshToken) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Verify JWT signature at the edge (fast, no DB call)
  try {
    await jwtVerify(refreshToken.value, getJwtSecret());
  } catch {
    // Invalid/expired refresh token — clear cookie and redirect
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(signInUrl);
    response.cookies.set('refresh_token', '', { path: '/', maxAge: 0 });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

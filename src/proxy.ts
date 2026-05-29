import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_PATHS, ROUTES } from '@/commons/constants';

const AUTH_PAGES = [
  ROUTES.AUTH.SIGNIN,
  ROUTES.AUTH.SIGNUP,
  ROUTES.AUTH.FORGOT_PASSWORD,
  ROUTES.AUTH.RESET_PASSWORD,
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const refreshToken = request.cookies.get('refresh_token')?.value;
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next');
  const isAuthPage = AUTH_PAGES.some((p) => pathname.startsWith(p));

  // Authenticated user trying to access auth pages → redirect to workspace chooser
  if (refreshToken && isAuthPage) {
    return NextResponse.redirect(new URL(ROUTES.CHOOSER, request.url));
  }

  // Public paths: allow without auth
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to signin
  if (!refreshToken) {
    const signinUrl = new URL(ROUTES.AUTH.SIGNIN, request.url);
    signinUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signinUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};

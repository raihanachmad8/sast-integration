import { NextRequest, NextResponse } from 'next/server';
import { PUBLIC_PATHS, ROUTES } from '@/commons/constants';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p)) || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get('refresh_token')?.value;
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

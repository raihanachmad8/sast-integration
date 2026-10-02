import type { NextResponse } from 'next/server';
import { env } from '@/server/env';
import { AUTH, NODE_ENV } from './constants';

/** Set the httpOnly refresh-token cookie (secure in production). */
export function setRefreshCookie(response: NextResponse, token: string) {
  response.cookies.set(AUTH.COOKIE.REFRESH_TOKEN, token, {
    httpOnly: true,
    secure: env.NODE_ENV === NODE_ENV.PRODUCTION,
    sameSite: AUTH.COOKIE.SAME_SITE,
    path: AUTH.COOKIE.PATH,
    maxAge: AUTH.COOKIE.MAX_AGE,
  });
}

/** Clear the refresh-token cookie. */
export function clearRefreshCookie(response: NextResponse) {
  response.cookies.set(AUTH.COOKIE.REFRESH_TOKEN, '', { path: AUTH.COOKIE.PATH, maxAge: 0 });
}

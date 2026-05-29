import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/server/env';
import { JWT_ALGORITHM } from '@/server/http/constants';

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export interface TokenPayload {
  sub: string;
  email: string;
  sessionId: string;
}

/**
 * Sign a short-lived access token containing user identity and session reference.
 * Expiry configured via `JWT_EXPIRES_IN` env var (default: 15m).
 */
export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(getSecret());
}

/**
 * Sign a long-lived refresh token containing only session reference.
 * Stored in httpOnly cookie. Expiry configured via `REFRESH_EXPIRES_IN` env var (default: 7d).
 */
export async function signRefreshToken(sessionId: string): Promise<string> {
  return new SignJWT({ sessionId })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(env.REFRESH_EXPIRES_IN)
    .sign(getSecret());
}

/**
 * Verify and decode a JWT token. Returns null if invalid or expired.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

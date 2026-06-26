import { SignJWT, jwtVerify } from 'jose';
import { env } from '@/server/env';
import { JWT_ALGORITHM } from '@/server/http/constants';
import { logger } from '@/server/lib/logger';

function getSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export interface TokenPayload {
  sub: string;
  sessionId: string;
}

/** Payload specifically for refresh tokens */
export interface RefreshTokenPayload {
  sessionId: string;
  refreshTokenId: string;   // Used for rotation + reuse detection
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
 * Signs a long-lived refresh token used for session renewal.
 *
 * The token contains both the session identifier and a unique `refreshTokenId`.
 * This enables refresh token rotation and reuse detection:
 * - On every successful refresh, a new `refreshTokenId` is generated.
 * - If an old (previously used) refresh token is presented, the mismatch
 *   between the token's `refreshTokenId` and the one stored in the session
 *   indicates token reuse (possible theft), and the entire session is revoked.
 *
 * @param payload - Contains sessionId and the current refreshTokenId
 * @returns Signed JWT refresh token
 */
export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
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

/**
 * Verifies and decodes a refresh token.
 *
 * Returns null on any validation failure (signature, expiry, malformed).
 * The caller is responsible for performing reuse detection using the
 * returned `refreshTokenId` against the value stored in the session.
 *
 * @param token - The refresh JWT from the cookie
 * @returns Decoded refresh token payload or null if invalid
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as RefreshTokenPayload;
  } catch {
    return null;
  }
}

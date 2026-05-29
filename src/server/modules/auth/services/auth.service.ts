import { hash, compare } from 'bcryptjs';
import { randomUUID, randomBytes } from 'crypto';
import { authRepository } from '../repositories/auth.repository';
import { signAccessToken, signRefreshToken } from './jwt.service';
import { AUTH, WORKSPACE_DEFAULTS, REGISTRATION_MODE, WORKSPACE_MODE } from '../constants';
import { env } from '@/server/env';
import { db } from '@/server/db/client';
import { workspaces, workspaceMembers } from '../../../../../drizzle/schema';
import { AppError } from '@/server/http/errors';
import { TOKEN_BYTES } from '@/server/http/constants';
import type { SignupInput, SigninInput, AcceptInviteInput, InviteInput } from '../schemas/auth.schema';

/**
 * Parse duration string (e.g. "15m", "7d") to milliseconds.
 * @param value - Duration string with format `<number><s|m|h|d>`
 * @returns Duration in milliseconds
 */
function parseExpiry(value: string): number {
  const match = value.match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 15 * 60 * 1000;
  const num = parseInt(match[1]);
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return num * (multipliers[match[2]] ?? 60_000);
}

export const authService = {
  /**
   * Register a new user account.
   * Creates user, personal workspace (if WORKSPACE_MODE=multiple), and membership in a single transaction.
   *
   * @param input - Validated signup data (email, password, name)
   * @returns Created user (id, email, name)
   * @throws {AppError} 403 - Registration disabled (invite mode)
   * @throws {AppError} 409 - Email already registered
   */
  async signup(input: SignupInput) {
    if (env.REGISTRATION_MODE === REGISTRATION_MODE.INVITE) {
      throw new AppError(AUTH.ERRORS.REGISTRATION_DISABLED, 403, AUTH.ERROR_CODE.AUTH);
    }

    const existing = await authRepository.findUserByEmail(input.email);
    if (existing) throw new AppError(AUTH.ERRORS.EMAIL_EXISTS, 409, AUTH.ERROR_CODE.AUTH);

    const passwordHash = await hash(input.password, AUTH.SALT_ROUNDS);

    const result = await db.transaction(async (tx) => {
      const user = await authRepository.createUser({ email: input.email, passwordHash, name: input.name }, tx);

      if (env.WORKSPACE_MODE === WORKSPACE_MODE.MULTIPLE) {
        const [workspace] = await tx.insert(workspaces).values({
          name: WORKSPACE_DEFAULTS.PERSONAL_NAME,
          slug: `${WORKSPACE_DEFAULTS.PERSONAL_SLUG_PREFIX}${user.id.slice(0, 8)}`,
          type: 'personal',
          createdBy: user.id,
          updatedBy: user.id,
        }).returning();

        await tx.insert(workspaceMembers).values({
          workspaceId: workspace.id,
          userId: user.id,
          role: 'owner',
        });
      }

      return { id: user.id, email: user.email, name: user.name };
    });

    return result;
  },

  /**
   * Authenticate user with email/password and create a session.
   * Returns JWT tokens with enterprise metadata (tokenType, expiresAt, expiresIn).
   *
   * @param input - Validated signin data (email, password)
   * @param meta - Optional request metadata for session tracking
   * @param meta.ip - Client IP address (from x-forwarded-for)
   * @param meta.userAgent - Client user agent string
   * @returns Token pair + user info
   * @throws {AppError} 401 - Invalid credentials
   */
  async signin(input: SigninInput, meta?: { ip?: string; userAgent?: string }) {
    const user = await authRepository.findUserByEmail(input.email);
    if (!user) throw new AppError(AUTH.ERRORS.INVALID_CREDENTIALS, 401, AUTH.ERROR_CODE.AUTH);

    const valid = await compare(input.password, user.passwordHash);
    if (!valid) throw new AppError(AUTH.ERRORS.INVALID_CREDENTIALS, 401, AUTH.ERROR_CODE.AUTH);

    const sessionId = randomUUID();
    await authRepository.createSession({
      id: sessionId,
      userId: user.id,
      ipAddress: meta?.ip,
      userAgent: meta?.userAgent,
    });

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, sessionId });
    const refreshToken = await signRefreshToken(sessionId);
    const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_EXPIRES_IN));

    return {
      tokenType: 'Bearer' as const,
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
      sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: !!user.emailVerifiedAt,
        currentWorkspaceId: user.currentWorkspaceId,
      },
    };
  },

  /**
   * Invalidate a session by deleting it from the database.
   * Subsequent requests with the same access token will be rejected (session check fails).
   *
   * @param sessionId - Session UUID to invalidate
   */
  async signout(sessionId: string) {
    await authRepository.deleteSession(sessionId);
  },

  /**
   * Rotate access and refresh tokens for an active session.
   * Validates session still exists before issuing new tokens.
   *
   * @param sessionId - Session UUID from refresh token payload
   * @returns New token pair with expiry metadata
   * @throws {AppError} 401 - Invalid session (deleted or expired)
   * @throws {AppError} 401 - User not found
   */
  async refresh(sessionId: string) {
    const session = await authRepository.findSession(sessionId);
    if (!session) throw new AppError(AUTH.ERRORS.INVALID_SESSION, 401, AUTH.ERROR_CODE.AUTH);

    const user = await authRepository.findUserById(session.userId);
    if (!user) throw new AppError(AUTH.ERRORS.USER_NOT_FOUND, 401, AUTH.ERROR_CODE.AUTH);

    const accessToken = await signAccessToken({ sub: user.id, email: user.email, sessionId });
    const refreshToken = await signRefreshToken(sessionId);
    const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_EXPIRES_IN));

    return {
      tokenType: 'Bearer' as const,
      accessToken,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      expiresIn: Math.floor((expiresAt.getTime() - Date.now()) / 1000),
    };
  },

  /**
   * Create a workspace invitation and generate a unique token.
   *
   * @param input - Validated invite data (email, role)
   * @param workspaceId - Target workspace UUID
   * @param invitedBy - User UUID who sent the invitation
   * @returns Generated invitation token and recipient email
   */
  async invite(input: InviteInput, workspaceId: string, invitedBy: string) {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await authRepository.createInvitation({
      email: input.email,
      role: input.role,
      workspaceId,
      invitedBy,
      token,
    });
    return { token, email: input.email };
  },

  /**
   * Accept a workspace invitation. Creates user (if new) and adds workspace membership.
   * Runs in a transaction to ensure atomicity.
   *
   * @param input - Validated accept data (token, password, name)
   * @returns Created/existing user (id, email, name)
   * @throws {AppError} 410 - Invitation expired or invalid
   * @throws {AppError} 410 - Invitation already accepted
   */
  async acceptInvite(input: AcceptInviteInput) {
    const invitation = await authRepository.findInvitationByToken(input.token);
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new AppError(AUTH.ERRORS.INVITE_EXPIRED, 410, AUTH.ERROR_CODE.AUTH);
    }
    if (invitation.acceptedAt) {
      throw new AppError(AUTH.ERRORS.INVITE_ALREADY_ACCEPTED, 410, AUTH.ERROR_CODE.AUTH);
    }

    const passwordHash = await hash(input.password, AUTH.SALT_ROUNDS);

    const result = await db.transaction(async (tx) => {
      let user = await authRepository.findUserByEmail(invitation.email);
      if (!user) {
        user = await authRepository.createUser({
          email: invitation.email,
          passwordHash,
          name: input.name,
          emailVerifiedAt: new Date(),
        }, tx);
      }

      await tx.insert(workspaceMembers).values({
        workspaceId: invitation.workspaceId,
        userId: user.id,
        role: invitation.role as 'owner' | 'manager' | 'reviewer' | 'member',
      });

      await authRepository.markInvitationAccepted(invitation.id, tx);

      return { id: user.id, email: user.email, name: user.name };
    });

    return result;
  },
};

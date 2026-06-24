import { eq, and, gt, sql, isNull } from 'drizzle-orm';
import { db, type Tx } from '@/server/db/client';
import { users, sessions, passwordResetTokens, emailVerificationTokens } from '@drizzle/schema';
import { logger } from '@/server/lib/logger';

export const authFlowsRepository = {
  /**
   * Find a user by email address. Excludes soft-deleted users.
   * @param email - User email to search
   * @returns User record or null if not found
   */
  async findUserByEmail(email: string) {
    logger.auth.debug('findUserByEmail called', { email });
    const [user] = await db.select().from(users).where(and(eq(users.email, email), isNull(users.deletedAt))).limit(1);
    return user ?? null;
  },

  /**
   * Find a user by ID. Excludes soft-deleted users.
   * @param id - User UUID
   * @returns User record or null if not found
   */
  async findUserById(id: string) {
    logger.auth.debug('findUserById called', { id });
    const [user] = await db.select().from(users).where(and(eq(users.id, id), isNull(users.deletedAt))).limit(1);
    return user ?? null;
  },

  /**
   * Find a recent password reset token for a user (within 5 minutes).
   * @param userId - User UUID
   * @returns Token record or null if none found
   */
  async findRecentPasswordResetToken(userId: string) {
    logger.auth.debug('findRecentPasswordResetToken called', { userId });
    const [recent] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, userId),
        gt(passwordResetTokens.createdAt, sql`NOW() - INTERVAL '5 minutes'`),
      )).limit(1);
    return recent ?? null;
  },

  /**
   * Insert a new password reset token.
   * @param data - Token data (userId, token, expiresAt)
   */
  async createPasswordResetToken(data: { userId: string; token: string; expiresAt: Date }) {
    logger.auth.debug('createPasswordResetToken called', { userId: data.userId });
    try {
      await db.insert(passwordResetTokens).values(data);
    } catch (error) {
      logger.auth.error('createPasswordResetToken failed', { error });
      throw error;
    }
  },

  /**
   * Find a password reset token by its token string.
   * @param token - Hex token string
   * @returns Token record or null if not found
   */
  async findPasswordResetToken(token: string) {
    logger.auth.debug('findPasswordResetToken called');
    const [record] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token)).limit(1);
    return record ?? null;
  },

  /**
   * Complete password reset: update password, delete sessions, mark token used.
   * @param userId - User UUID
   * @param passwordHash - New hashed password
   * @param tokenId - Password reset token UUID
   * @param tx - Transaction context
   */
  async completePasswordReset(userId: string, passwordHash: string, tokenId: string, tx: Tx) {
    logger.auth.debug('completePasswordReset called', { userId, tokenId });
    try {
      await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
    } catch (error) {
      logger.auth.error('completePasswordReset failed', { error });
      throw error;
    }
  },

  /**
   * Find a recent email verification token for a user (within 5 minutes).
   * @param userId - User UUID
   * @returns Token record or null if none found
   */
  async findRecentEmailVerificationToken(userId: string) {
    logger.auth.debug('findRecentEmailVerificationToken called', { userId });
    const [recent] = await db.select().from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        gt(emailVerificationTokens.createdAt, sql`NOW() - INTERVAL '5 minutes'`),
      )).limit(1);
    return recent ?? null;
  },

  /**
   * Insert a new email verification token.
   * @param data - Token data (userId, token, expiresAt)
   */
  async createEmailVerificationToken(data: { userId: string; token: string; expiresAt: Date }) {
    logger.auth.debug('createEmailVerificationToken called', { userId: data.userId });
    try {
      await db.insert(emailVerificationTokens).values(data);
    } catch (error) {
      logger.auth.error('createEmailVerificationToken failed', { error });
      throw error;
    }
  },

  /**
   * Find an email verification token by its token string.
   * @param token - Hex token string
   * @returns Token record or null if not found
   */
  async findEmailVerificationToken(token: string) {
    logger.auth.debug('findEmailVerificationToken called');
    const [record] = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token)).limit(1);
    return record ?? null;
  },

  /**
   * Mark email as verified and token as used.
   * @param userId - User UUID
   * @param tokenId - Email verification token UUID
   */
  async completeEmailVerification(userId: string, tokenId: string) {
    logger.auth.debug('completeEmailVerification called', { userId, tokenId });
    try {
      await db.transaction(async (tx) => {
        await tx.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
        await tx.update(emailVerificationTokens).set({ verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, tokenId));
      });
    } catch (error) {
      logger.auth.error('completeEmailVerification failed', { error });
      throw error;
    }
  },
};

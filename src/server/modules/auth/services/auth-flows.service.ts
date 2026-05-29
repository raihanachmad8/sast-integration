import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { eq, and, gt, sql } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users, passwordResetTokens, emailVerificationTokens } from '../../../../../drizzle/schema';
import { sendMail } from '@/server/modules/mail/mail.service';
import { resetPasswordTemplate, verifyEmailTemplate } from '@/server/modules/mail/templates';
import { MAIL } from '@/server/modules/mail/constants';
import { AUTH } from '@/server/modules/auth/constants';
import { AppError } from '@/server/http/errors';
import { TOKEN_BYTES } from '@/server/http/constants';
import { ROUTES } from '@/commons/constants/routes';

const APP_URL = () => process.env.APP_URL ?? 'http://localhost:3000';

function buildAppUrl(path: string, params: Record<string, string>) {
  const url = new URL(path, APP_URL());
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return url.toString();
}

export const authFlowsService = {
  /**
   * Send password reset email with token link.
   * Rate limited: 1 per 5 minutes per email.
   */
  async forgotPassword(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) return; // Silent — don't reveal if email exists

    // Rate limit check
    const [recent] = await db.select().from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.userId, user.id),
        gt(passwordResetTokens.createdAt, sql`NOW() - INTERVAL '5 minutes'`),
      )).limit(1);
    if (recent) throw new AppError(MAIL.MESSAGES.RATE_LIMITED, 429, MAIL.ERROR_CODE);

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await db.insert(passwordResetTokens).values({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + MAIL.TOKEN_EXPIRY.PASSWORD_RESET),
    });

    const resetUrl = buildAppUrl(ROUTES.AUTH.RESET_PASSWORD, { token });
    await sendMail({
      to: user.email,
      subject: MAIL.SUBJECTS.RESET_PASSWORD,
      html: resetPasswordTemplate(user.name, resetUrl),
    });
  },

  /**
   * Verify reset token and set new password.
   */
  async resetPassword(token: string, newPassword: string) {
    const [record] = await db.select().from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token)).limit(1);

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(MAIL.MESSAGES.TOKEN_EXPIRED, 410, MAIL.ERROR_CODE);
    }
    if (record.usedAt) {
      throw new AppError(MAIL.MESSAGES.TOKEN_ALREADY_USED, 410, MAIL.ERROR_CODE);
    }

    const passwordHash = await hash(newPassword, AUTH.SALT_ROUNDS);
    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
  },

  /**
   * Send email verification link to user.
   */
  async sendVerificationEmail(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return;
    if (user.emailVerifiedAt) throw new AppError(MAIL.MESSAGES.EMAIL_ALREADY_VERIFIED, 400, MAIL.ERROR_CODE);

    // Rate limit
    const [recent] = await db.select().from(emailVerificationTokens)
      .where(and(
        eq(emailVerificationTokens.userId, userId),
        gt(emailVerificationTokens.createdAt, sql`NOW() - INTERVAL '5 minutes'`),
      )).limit(1);
    if (recent) throw new AppError(MAIL.MESSAGES.RATE_LIMITED, 429, MAIL.ERROR_CODE);

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await db.insert(emailVerificationTokens).values({
      userId,
      token,
      expiresAt: new Date(Date.now() + MAIL.TOKEN_EXPIRY.EMAIL_VERIFICATION),
    });

    const verifyUrl = buildAppUrl(ROUTES.AUTH.VERIFY_EMAIL, { token });
    await sendMail({
      to: user.email,
      subject: MAIL.SUBJECTS.VERIFY_EMAIL,
      html: verifyEmailTemplate(user.name, verifyUrl),
    });
  },

  /**
   * Verify email from token.
   */
  async verifyEmail(token: string) {
    const [record] = await db.select().from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token)).limit(1);

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(MAIL.MESSAGES.TOKEN_EXPIRED, 410, MAIL.ERROR_CODE);
    }
    if (record.verifiedAt) {
      throw new AppError(MAIL.MESSAGES.TOKEN_ALREADY_USED, 410, MAIL.ERROR_CODE);
    }

    await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, record.userId));
    await db.update(emailVerificationTokens).set({ verifiedAt: new Date() }).where(eq(emailVerificationTokens.id, record.id));
  },
};

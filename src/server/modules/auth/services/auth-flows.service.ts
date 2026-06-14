import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { db } from '@/server/db/client';
import { sendMail } from '@/server/modules/mail/mail.service';
import { resetPasswordTemplate, verifyEmailTemplate } from '@/server/modules/mail/templates';
import { MAIL } from '@/server/modules/mail/constants';
import { AUTH } from '../constants';
import { AppError } from '@/server/http/errors';
import { TOKEN_BYTES } from '@/server/http/constants';
import { ROUTES } from '@/commons/constants/routes';
import { env } from '@/server/env';
import { logger } from '@/server/lib/logger';
import { authFlowsRepository } from '../repositories/auth-flows.repository';

const APP_URL = () => env.APP_URL;

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
    logger.auth.info('forgotPassword', { email });
    const user = await authFlowsRepository.findUserByEmail(email);
    if (!user) return;

    const recent = await authFlowsRepository.findRecentPasswordResetToken(user.id);
    if (recent) throw new AppError(MAIL.MESSAGES.RATE_LIMITED, 429, MAIL.ERROR_CODE);

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await authFlowsRepository.createPasswordResetToken({
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
    logger.auth.info('forgotPassword completed', { email });
  },

  /**
   * Verify reset token and set new password.
   */
  async resetPassword(token: string, newPassword: string) {
    logger.auth.info('resetPassword');
    const record = await authFlowsRepository.findPasswordResetToken(token);

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(MAIL.MESSAGES.TOKEN_EXPIRED, 410, MAIL.ERROR_CODE);
    }
    if (record.usedAt) {
      throw new AppError(MAIL.MESSAGES.TOKEN_ALREADY_USED, 410, MAIL.ERROR_CODE);
    }

    const passwordHash = await hash(newPassword, AUTH.SALT_ROUNDS);
    await db.transaction(async (tx) => {
      await authFlowsRepository.completePasswordReset(record.userId, passwordHash, record.id, tx);
    });
    logger.auth.info('resetPassword completed', { userId: record.userId });
  },

  /**
   * Send email verification link to user.
   */
  async sendVerificationEmail(userId: string) {
    logger.auth.info('sendVerificationEmail', { userId });
    const user = await authFlowsRepository.findUserById(userId);
    if (!user) return;
    if (user.emailVerifiedAt) throw new AppError(MAIL.MESSAGES.EMAIL_ALREADY_VERIFIED, 400, MAIL.ERROR_CODE);

    const recent = await authFlowsRepository.findRecentEmailVerificationToken(userId);
    if (recent) throw new AppError(MAIL.MESSAGES.RATE_LIMITED, 429, MAIL.ERROR_CODE);

    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await authFlowsRepository.createEmailVerificationToken({
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
    logger.auth.info('sendVerificationEmail completed', { userId });
  },

  /**
   * Verify email from token.
   */
  async verifyEmail(token: string) {
    logger.auth.info('verifyEmail');
    const record = await authFlowsRepository.findEmailVerificationToken(token);

    if (!record || record.expiresAt < new Date()) {
      throw new AppError(MAIL.MESSAGES.TOKEN_EXPIRED, 410, MAIL.ERROR_CODE);
    }
    if (record.verifiedAt) {
      throw new AppError(MAIL.MESSAGES.TOKEN_ALREADY_USED, 410, MAIL.ERROR_CODE);
    }

    await authFlowsRepository.completeEmailVerification(record.userId, record.id);
    logger.auth.info('verifyEmail completed', { userId: record.userId });
  },
};

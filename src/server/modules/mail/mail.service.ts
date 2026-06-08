import nodemailer from 'nodemailer';
import { env } from '@/server/env';
import { MAIL } from './constants';
import { logger } from '@/server/lib/logger';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let _transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (_transporter) return _transporter;

  if (env.MAIL_PROVIDER === MAIL.PROVIDER.SMTP) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
  } else {
    // Console provider — logs to stdout, no real transport
    _transporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return _transporter;
}

/**
 * Send an email using the configured provider.
 *
 * - `console`: logs the message JSON to stdout (dev only)
 * - `smtp`: sends via configured SMTP server
 *
 * @param options - Mail options (to, subject, html, optional text)
 */
export async function sendMail(options: SendMailOptions): Promise<void> {
  logger.mail.info('sendMail', { to: options.to, subject: options.subject });
  const transporter = getTransporter();
  const from = env.SMTP_FROM;

  if (env.MAIL_PROVIDER === MAIL.PROVIDER.CONSOLE) {
    await transporter.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.mail.info('sendMail completed (console)', { to: options.to });
    return;
  }

  await transporter.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
  logger.mail.info('sendMail completed', { to: options.to });
}

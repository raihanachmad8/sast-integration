import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { env } from '@/server/env';
import { MAIL } from './constants';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  if (env.MAIL_PROVIDER === MAIL.PROVIDER.SMTP) {
    _transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  } else {
    _transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return _transporter;
}

/**
 * Send an email via configured transport.
 * SMTP for production/Mailpit, console for dev/test.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  const transporter = getTransporter();
  const info = await transporter.sendMail({ from: env.SMTP_FROM, ...options });

  if (env.MAIL_PROVIDER !== MAIL.PROVIDER.SMTP) {
    console.log('[mail]', JSON.parse(info.message).subject, '→', options.to);
  }
}

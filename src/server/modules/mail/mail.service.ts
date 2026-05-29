import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { MAIL } from './constants';

interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const provider = process.env.MAIL_PROVIDER ?? MAIL.PROVIDER.CONSOLE;

  if (provider === MAIL.PROVIDER.SMTP) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } else {
    // Console transport — logs email to stdout (dev/test)
    _transporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return _transporter;
}

/**
 * Send an email via configured transport.
 * SMTP for production/Mailpit, console for dev/test.
 */
export async function sendMail(options: MailOptions): Promise<void> {
  const from = process.env.SMTP_FROM ?? 'noreply@sast.local';
  const transporter = getTransporter();
  const info = await transporter.sendMail({ from, ...options });

  if (process.env.MAIL_PROVIDER !== MAIL.PROVIDER.SMTP) {
    console.log('[mail]', JSON.parse(info.message).subject, '→', options.to);
  }
}

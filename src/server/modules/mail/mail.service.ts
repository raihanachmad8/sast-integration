import nodemailer from 'nodemailer';
import { env } from '@/server/env';
import { MAIL } from './constants';

/** Mail options passed to any transport */
export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

/** Transport interface — implement this to add new providers (Resend, SES, etc.) */
export interface MailTransport {
  send(options: MailOptions): Promise<void>;
}

/** SMTP transport — works with Mailpit (dev) and real SMTP (prod) */
class SmtpTransport implements MailTransport {
  private transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: false,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  async send(options: MailOptions): Promise<void> {
    await this.transporter.sendMail({ from: env.SMTP_FROM, ...options });
  }
}

/** Console transport — logs email to stdout (dev/test/CI) */
class ConsoleTransport implements MailTransport {
  async send(options: MailOptions): Promise<void> {
    console.log(`[mail] "${options.subject}" → ${options.to}`);
  }
}

// TODO: Add ResendTransport when deploying without SMTP
// class ResendTransport implements MailTransport {
//   async send(options: MailOptions) { /* call Resend API with env.RESEND_API_KEY */ }
// }

let _transport: MailTransport | null = null;

function getTransport(): MailTransport {
  if (_transport) return _transport;

  switch (env.MAIL_PROVIDER) {
    case MAIL.PROVIDER.SMTP:
      _transport = new SmtpTransport();
      break;
    default:
      _transport = new ConsoleTransport();
  }

  return _transport;
}

/**
 * Send an email via the configured transport.
 * Transport resolved from `MAIL_PROVIDER` env var.
 *
 * @param options - Recipient, subject, and HTML body
 */
export async function sendMail(options: MailOptions): Promise<void> {
  await getTransport().send(options);
}

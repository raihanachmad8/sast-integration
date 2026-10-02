/**
 * Unit tests for mailService
 *
 * Tests email transport logic including:
 * - Console transport selection (default)
 * - SMTP transport selection
 * - sendMail delegates to configured transport
 *
 * Focus is on the transport routing logic, not actual email delivery.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSendMail, mockConsoleLog } = vi.hoisted(() => ({
  mockSendMail: vi.fn().mockResolvedValue(undefined),
  mockConsoleLog: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
  },
}));

vi.mock('@/server/env', () => ({
  env: {
    MAIL_PROVIDER: 'console',
    SMTP_HOST: 'localhost',
    SMTP_PORT: 1025,
    SMTP_FROM: 'test@sast.local',
  },
}));

import { sendMail } from '@/server/modules/mail/mail.service';
import { env } from '@/server/env';

describe('sendMail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConsoleLog.mockClear();
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog);
    (env as { MAIL_PROVIDER: string }).MAIL_PROVIDER = 'console';
  });

  it('should log to console when MAIL_PROVIDER is console', async () => {
    await sendMail({ to: 'user@example.com', subject: 'Test', html: '<p>Hello</p>' });
    expect(mockConsoleLog).toHaveBeenCalledWith(
      expect.stringContaining('user@example.com')
    );
  });

  it('should send via SMTP when MAIL_PROVIDER is smtp', async () => {
    (env as { MAIL_PROVIDER: string }).MAIL_PROVIDER = 'smtp';

    vi.resetModules();
    const { sendMail: freshSendMail } = await import('@/server/modules/mail/mail.service');
    await freshSendMail({ to: 'user@example.com', subject: 'Test', html: '<p>Hello</p>' });

    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Test',
      })
    );
  });
});

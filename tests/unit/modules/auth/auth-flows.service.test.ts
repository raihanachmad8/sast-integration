import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
}));

const mailMocks = vi.hoisted(() => ({
  sendMail: vi.fn(),
}));

vi.mock('@/server/db/client', () => ({
  db: dbMocks,
}));

vi.mock('@/server/modules/mail/mail.service', () => ({
  sendMail: mailMocks.sendMail,
}));

import { authFlowsService } from '@/server/modules/auth/services/auth-flows.service';

function selectRows(rows: unknown[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  };
}

function insertValues() {
  return {
    values: vi.fn().mockResolvedValue(undefined),
  };
}

describe('authFlowsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
    dbMocks.insert.mockReturnValue(insertValues());
    dbMocks.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });
  });

  it('should send password reset links to the canonical /auth/reset-password page', async () => {
    dbMocks.select
      .mockReturnValueOnce(selectRows([{ id: 'user-1', email: 'admin@sast.local', name: 'Admin' }]))
      .mockReturnValueOnce(selectRows([]));

    await authFlowsService.forgotPassword('admin@sast.local');

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@sast.local',
        html: expect.stringContaining('http://localhost:3000/auth/reset-password?token='),
      }),
    );
  });

  it('should send verification links to the canonical /auth/verify-email page', async () => {
    dbMocks.select
      .mockReturnValueOnce(selectRows([{ id: 'user-1', email: 'new@example.com', name: 'New User', emailVerifiedAt: null }]))
      .mockReturnValueOnce(selectRows([]));

    await authFlowsService.sendVerificationEmail('user-1');

    expect(mailMocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'new@example.com',
        html: expect.stringContaining('http://localhost:3000/auth/verify-email?token='),
      }),
    );
  });
});

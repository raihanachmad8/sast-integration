import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/server/env', () => ({
  env: new Proxy({ APP_URL: 'http://localhost:3000' } as Record<string, string>, {
    get(target, prop: string) {
      return target[prop] ?? process.env[prop] ?? '';
    },
  }),
}));

vi.mock('@/server/lib/logger', () => ({
  logger: {
    invitation: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  },
}));

vi.mock('@/server/modules/mail/mail.service', () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/server/modules/mail/templates', () => ({
  workspaceInviteTemplate: vi.fn().mockReturnValue('<p>Invite</p>'),
}));

vi.mock('@/server/db/client', () => ({
  db: {
    transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(null)),
  },
}));

vi.mock('@/server/modules/members/repositories/member.repository', () => ({
  memberRepository: {
    getMemberRole: vi.fn(),
  },
}));

vi.mock('@/server/modules/invitations/repositories/invitation.repository', () => ({
  invitationRepository: {
    list: vi.fn(),
    create: vi.fn(),
    find: vi.fn(),
    findPending: vi.fn(),
    revoke: vi.fn(),
    isEmailWorkspaceMember: vi.fn(),
    findWorkspaceById: vi.fn(),
  },
}));

import { ROLE } from '@/commons/constants/permissions';
import { invitationService } from '@/server/modules/invitations/services/invitation.service';
import { invitationRepository } from '@/server/modules/invitations/repositories/invitation.repository';
import { memberRepository } from '@/server/modules/members/repositories/member.repository';
import { sendMail } from '@/server/modules/mail/mail.service';
import { INVITATION } from '@/server/modules/invitations/constants';

describe('invitationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(memberRepository.getMemberRole).mockResolvedValue(ROLE.OWNER);
  });

  describe('list', () => {
    it('should return paginated invitations', async () => {
      vi.mocked(invitationRepository.list).mockResolvedValue({
        data: [{ id: 'inv-1', email: 'a@b.com', role: 'member' }],
        total: 1,
        page: 1,
        perPage: 20,
        lastPage: 1,
      });

      const result = await invitationService.list('ws-1');

      expect(result.data).toHaveLength(1);
      expect(invitationRepository.list).toHaveBeenCalledWith('ws-1', undefined);
    });
  });

  describe('invite', () => {
    it('should create invitation and send email', async () => {
      vi.mocked(invitationRepository.isEmailWorkspaceMember).mockResolvedValue(false);
      vi.mocked(invitationRepository.findPending).mockResolvedValue(null);
      vi.mocked(invitationRepository.create).mockResolvedValue({
        id: 'inv-1',
        email: 'new@example.com',
        token: 'abc',
      } as never);
      vi.mocked(invitationRepository.findWorkspaceById).mockResolvedValue({ name: 'Test WS' } as never);

      const result = await invitationService.invite('ws-1', { email: 'new@example.com', role: 'member' }, 'actor-1');

      expect(result.email).toBe('new@example.com');
      expect(sendMail).toHaveBeenCalledOnce();
    });

    it('should throw ALREADY_MEMBER if user is already in workspace', async () => {
      vi.mocked(invitationRepository.isEmailWorkspaceMember).mockResolvedValue(true);

      await expect(
        invitationService.invite('ws-1', { email: 'existing@b.com', role: 'member' }, 'actor-1')
      ).rejects.toThrow(INVITATION.ERRORS.ALREADY_MEMBER);
    });

    it('should revoke previous pending invitation before creating new one', async () => {
      vi.mocked(invitationRepository.isEmailWorkspaceMember).mockResolvedValue(false);
      vi.mocked(invitationRepository.findPending).mockResolvedValue({ id: 'old-inv' } as never);
      vi.mocked(invitationRepository.revoke).mockResolvedValue(undefined);
      vi.mocked(invitationRepository.create).mockResolvedValue({
        id: 'new-inv',
        email: 'user@test.com',
      } as never);
      vi.mocked(invitationRepository.findWorkspaceById).mockResolvedValue({ name: 'WS' } as never);

      await invitationService.invite('ws-1', { email: 'user@test.com', role: 'manager' }, 'actor-1');

      expect(invitationRepository.revoke).toHaveBeenCalledWith('old-inv', null);
      expect(invitationRepository.create).toHaveBeenCalledOnce();
    });

    it('should still return result even if email fails', async () => {
      vi.mocked(invitationRepository.isEmailWorkspaceMember).mockResolvedValue(false);
      vi.mocked(invitationRepository.findPending).mockResolvedValue(null);
      vi.mocked(invitationRepository.create).mockResolvedValue({
        id: 'inv-2',
        email: 'fail@test.com',
      } as never);
      vi.mocked(sendMail).mockRejectedValueOnce(new Error('SMTP down'));

      const result = await invitationService.invite('ws-1', { email: 'fail@test.com', role: 'member' }, 'actor-1');

      expect(result.id).toBe('inv-2');
    });
  });

  describe('revoke', () => {
    it('should revoke invitation when actor is owner', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(invitationRepository.find).mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
      } as never);
      vi.mocked(invitationRepository.revoke).mockResolvedValue(undefined);

      await invitationService.revoke('ws-1', 'inv-1', 'owner-1');

      expect(invitationRepository.revoke).toHaveBeenCalledWith('inv-1');
    });

    it('should revoke invitation when actor is manager', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue('manager');
      vi.mocked(invitationRepository.find).mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-1',
      } as never);
      vi.mocked(invitationRepository.revoke).mockResolvedValue(undefined);

      await invitationService.revoke('ws-1', 'inv-1', 'mgr-1');

      expect(invitationRepository.revoke).toHaveBeenCalledWith('inv-1');
    });

    it('should throw 403 when actor is not owner/manager', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue('member');

      await expect(
        invitationService.revoke('ws-1', 'inv-1', 'member-1')
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should throw 403 when actor has no role', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue(null);

      await expect(
        invitationService.revoke('ws-1', 'inv-1', 'ghost-1')
      ).rejects.toThrow('Insufficient permissions');
    });

    it('should throw 404 when invitation not found', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(invitationRepository.find).mockResolvedValue(null);

      await expect(
        invitationService.revoke('ws-1', 'nonexistent', 'owner-1')
      ).rejects.toThrow(INVITATION.ERRORS.INVITATION_NOT_FOUND);
    });

    it('should throw 404 when invitation belongs to different workspace', async () => {
      vi.mocked(memberRepository.getMemberRole).mockResolvedValue('owner');
      vi.mocked(invitationRepository.find).mockResolvedValue({
        id: 'inv-1',
        workspaceId: 'ws-other',
      } as never);

      await expect(
        invitationService.revoke('ws-1', 'inv-1', 'owner-1')
      ).rejects.toThrow(INVITATION.ERRORS.INVITATION_NOT_FOUND);
    });
  });
});

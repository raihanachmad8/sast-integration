import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  get: vi.fn(),
  update: vi.fn(),
  setAvatarUrl: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
};

vi.mock('@/server/modules/profile/profile.repository', () => ({
  profileRepository: mockRepo,
}));

vi.mock('@/server/modules/storage/storage.service', () => ({
  getStorageDriver: vi.fn().mockResolvedValue({
    upload: vi.fn().mockResolvedValue({ url: 'https://cdn/avatar.png' }),
  }),
}));

vi.mock('@/server/db/client', () => ({
  db: {
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  },
}));

vi.mock('bcryptjs', () => ({
  hash: vi.fn().mockResolvedValue('$2a$12$hashed'),
  compare: vi.fn().mockResolvedValue(true),
}));

const { profileService } = await import('@/server/modules/profile/profile.service');

describe('profileService.get', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return user profile with all fields', async () => {
    mockRepo.get.mockResolvedValue({ id: 'u-1', name: 'Alice', email: 'a@test.com', avatarUrl: 'https://cdn/a.png' });
    const result = await profileService.get('u-1');
    expect(result.id).toBe('u-1');
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('a@test.com');
  });

  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.get.mockResolvedValue(null);
    await expect(profileService.get('u-1')).rejects.toThrow('User not found');
  });

  it('- should call repo with correct userId', async () => {
    mockRepo.get.mockResolvedValue({ id: 'u-2' });
    await profileService.get('u-2');
    expect(mockRepo.get).toHaveBeenCalledWith('u-2');
  });
});

describe('profileService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should update profile name', async () => {
    mockRepo.update.mockResolvedValue({ id: 'u-1', name: 'Bob' });
    const result = await profileService.update('u-1', { name: 'Bob' });
    expect(result.name).toBe('Bob');
  });

  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.update.mockResolvedValue(null);
    await expect(profileService.update('u-1', { name: 'X' })).rejects.toThrow('User not found');
  });

  it('- should pass data to repository', async () => {
    mockRepo.update.mockResolvedValue({ id: 'u-1' });
    await profileService.update('u-1', { name: 'New' });
    expect(mockRepo.update).toHaveBeenCalledWith('u-1', { name: 'New' });
  });
});

describe('profileService.uploadAvatar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return avatarUrl on success', async () => {
    mockRepo.setAvatarUrl.mockResolvedValue({ id: 'u-1', avatarUrl: 'https://cdn/avatar.png' });
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    const result = await profileService.uploadAvatar('u-1', file);
    expect(result.avatarUrl).toBe('https://cdn/avatar.png');
  });

  it('- should throw VALIDATION_ERROR for invalid file type', async () => {
    const file = new File(['data'], 'doc.pdf', { type: 'application/pdf' });
    await expect(profileService.uploadAvatar('u-1', file)).rejects.toThrow('Invalid file type');
  });

  it('- should throw VALIDATION_ERROR for oversized file', async () => {
    const file = new File([new ArrayBuffer(6 * 1024 * 1024)], 'big.png', { type: 'image/png' });
    await expect(profileService.uploadAvatar('u-1', file)).rejects.toThrow('File size exceeds 5MB limit');
  });

  it('- should throw INTERNAL_ERROR when setAvatarUrl returns null', async () => {
    mockRepo.setAvatarUrl.mockResolvedValue(null);
    const file = new File(['data'], 'avatar.png', { type: 'image/png' });
    await expect(profileService.uploadAvatar('u-1', file)).rejects.toThrow('Failed to upload avatar');
  });
});

describe('profileService.removeAvatar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should set avatarUrl to null', async () => {
    mockRepo.setAvatarUrl.mockResolvedValue({ id: 'u-1', avatarUrl: null });
    const result = await profileService.removeAvatar('u-1');
    expect(result.avatarUrl).toBeNull();
  });

  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.setAvatarUrl.mockResolvedValue(null);
    await expect(profileService.removeAvatar('u-1')).rejects.toThrow('User not found');
  });
});

describe('profileService.getSessions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should return sessions list', async () => {
    mockRepo.listSessions.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);
    const result = await profileService.getSessions('u-1');
    expect(result.sessions).toHaveLength(2);
  });

  it('+ should return empty sessions list', async () => {
    mockRepo.listSessions.mockResolvedValue([]);
    const result = await profileService.getSessions('u-1');
    expect(result.sessions).toHaveLength(0);
  });

  it('- should call repo with correct userId', async () => {
    mockRepo.listSessions.mockResolvedValue([]);
    await profileService.getSessions('u-2');
    expect(mockRepo.listSessions).toHaveBeenCalledWith('u-2');
  });
});

describe('profileService.revokeSession', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should revoke session successfully', async () => {
    mockRepo.deleteSession.mockResolvedValue(true);
    await expect(profileService.revokeSession('u-1', 's-1')).resolves.toBeUndefined();
  });

  it('- should throw NOT_FOUND when session does not exist', async () => {
    mockRepo.deleteSession.mockResolvedValue(false);
    await expect(profileService.revokeSession('u-1', 's-1')).rejects.toThrow('Session not found');
  });
});

describe('profileService.changePassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('+ should change password successfully', async () => {
    mockRepo.get.mockResolvedValue({ id: 'u-1', passwordHash: '$2a$12$oldhash' });
    await expect(profileService.changePassword('u-1', 'old', 'new')).resolves.toBeUndefined();
  });

  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.get.mockResolvedValue(null);
    await expect(profileService.changePassword('u-1', 'old', 'new')).rejects.toThrow('User not found');
  });

  it('- should throw VALIDATION_ERROR when current password is incorrect', async () => {
    const { compare } = await import('bcryptjs');
    vi.mocked(compare).mockResolvedValueOnce(false);
    mockRepo.get.mockResolvedValue({ id: 'u-1', passwordHash: '$2a$12$hash' });
    await expect(profileService.changePassword('u-1', 'wrong', 'new')).rejects.toThrow('Current password is incorrect');
  });
});

describe('negative', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('- should propagate repository errors for get', async () => {
    mockRepo.get.mockRejectedValue(new Error('DB connection failed'));
    await expect(profileService.get('u-1')).rejects.toThrow('DB connection failed');
  });

  it('- should propagate repository errors for update', async () => {
    mockRepo.update.mockRejectedValue(new Error('DB timeout'));
    await expect(profileService.update('u-1', { name: 'X' })).rejects.toThrow('DB timeout');
  });

  it('- should propagate repository errors for listSessions', async () => {
    mockRepo.listSessions.mockRejectedValue(new Error('DB error'));
    await expect(profileService.getSessions('u-1')).rejects.toThrow('DB error');
  });

  it('- should propagate repository errors for deleteSession', async () => {
    mockRepo.deleteSession.mockRejectedValue(new Error('DB error'));
    await expect(profileService.revokeSession('u-1', 's-1')).rejects.toThrow('DB error');
  });
});

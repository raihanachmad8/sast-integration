import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRepo = {
  get: vi.fn(),
  update: vi.fn(),
  uploadAvatar: vi.fn(),
  removeAvatar: vi.fn(),
  listSessions: vi.fn(),
  deleteSession: vi.fn(),
  changePassword: vi.fn(),
};

vi.mock('@/server/modules/profile/profile.repository', () => ({
  profileRepository: mockRepo,
}));

const { profileService } = await import('@/server/modules/profile/profile.service');

describe('profileService.get', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a user profile is returned with all fields
   */
  it('+ should return user profile with all fields', async () => {
    mockRepo.get.mockResolvedValue({ id: 'u-1', name: 'Alice', email: 'a@test.com', avatarUrl: 'https://cdn/a.png' });
    const result = await profileService.get('u-1');
    expect(result.id).toBe('u-1');
    expect(result.name).toBe('Alice');
    expect(result.email).toBe('a@test.com');
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for nonexistent users
   */
  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.get.mockResolvedValue(null);
    await expect(profileService.get('u-1')).rejects.toThrow('User not found');
  });

  /**
   * Purpose: Validates that the repository is called with the correct userId
   */
  it('- should call repo with correct userId', async () => {
    mockRepo.get.mockResolvedValue({ id: 'u-2' });
    await profileService.get('u-2');
    expect(mockRepo.get).toHaveBeenCalledWith('u-2');
  });
});

describe('profileService.update', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a profile name can be updated
   */
  it('+ should update profile name', async () => {
    mockRepo.update.mockResolvedValue({ id: 'u-1', name: 'Bob' });
    const result = await profileService.update('u-1', { name: 'Bob' });
    expect(result.name).toBe('Bob');
  });

  /**
   * Purpose: Validates that multiple profile fields can be updated at once
   */
  it('+ should update profile with multiple fields', async () => {
    mockRepo.update.mockResolvedValue({ id: 'u-1', name: 'Bob', avatarUrl: 'https://cdn/b.png' });
    const result = await profileService.update('u-1', { name: 'Bob', avatarUrl: 'https://cdn/b.png' });
    expect(result.name).toBe('Bob');
    expect(result.avatarUrl).toBe('https://cdn/b.png');
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for nonexistent users
   */
  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.update.mockResolvedValue(null);
    await expect(profileService.update('u-1', { name: 'X' })).rejects.toThrow('User not found');
  });

  /**
   * Purpose: Validates that update data is forwarded to the repository
   */
  it('- should pass data to repository', async () => {
    mockRepo.update.mockResolvedValue({ id: 'u-1' });
    await profileService.update('u-1', { name: 'New' });
    expect(mockRepo.update).toHaveBeenCalledWith('u-1', { name: 'New' });
  });
});

describe('profileService.uploadAvatar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that the avatarUrl is returned on successful upload
   */
  it('+ should return avatarUrl on success', async () => {
    mockRepo.uploadAvatar.mockResolvedValue('https://cdn/avatar.png');
    const result = await profileService.uploadAvatar('u-1', new File([], 'avatar.png'));
    expect(result.avatarUrl).toBe('https://cdn/avatar.png');
  });

  /**
   * Purpose: Validates that an error is thrown when avatar upload returns null
   */
  it('- should throw INTERNAL_ERROR when upload fails', async () => {
    mockRepo.uploadAvatar.mockResolvedValue(null);
    await expect(profileService.uploadAvatar('u-1', new File([], 'f'))).rejects.toThrow('Failed to upload avatar');
  });

  /**
   * Purpose: Validates that an error is thrown when avatar upload returns empty string
   */
  it('- should throw INTERNAL_ERROR when upload returns empty string', async () => {
    mockRepo.uploadAvatar.mockResolvedValue('');
    await expect(profileService.uploadAvatar('u-1', new File([], 'f'))).rejects.toThrow('Failed to upload avatar');
  });
});

describe('profileService.removeAvatar', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that avatar is removed and avatarUrl is set to null
   */
  it('+ should set avatarUrl to null', async () => {
    mockRepo.removeAvatar.mockResolvedValue({ id: 'u-1', avatarUrl: null });
    const result = await profileService.removeAvatar('u-1');
    expect(result.avatarUrl).toBeNull();
  });

  /**
   * Purpose: Validates that NOT_FOUND is thrown for nonexistent users
   */
  it('- should throw NOT_FOUND when user does not exist', async () => {
    mockRepo.removeAvatar.mockResolvedValue(null);
    await expect(profileService.removeAvatar('u-1')).rejects.toThrow('User not found');
  });
});

describe('profileService.getSessions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that all user sessions are returned
   */
  it('+ should return sessions list', async () => {
    mockRepo.listSessions.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);
    const result = await profileService.getSessions('u-1');
    expect(result.sessions).toHaveLength(2);
  });

  /**
   * Purpose: Validates that an empty sessions array is returned when no sessions exist
   */
  it('+ should return empty sessions list', async () => {
    mockRepo.listSessions.mockResolvedValue([]);
    const result = await profileService.getSessions('u-1');
    expect(result.sessions).toHaveLength(0);
  });

  /**
   * Purpose: Validates that the repository is called with the correct userId
   */
  it('- should call repo with correct userId', async () => {
    mockRepo.listSessions.mockResolvedValue([]);
    await profileService.getSessions('u-2');
    expect(mockRepo.listSessions).toHaveBeenCalledWith('u-2');
  });
});

describe('profileService.revokeSession', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a session can be revoked successfully
   */
  it('+ should revoke session successfully', async () => {
    mockRepo.deleteSession.mockResolvedValue(true);
    await expect(profileService.revokeSession('u-1', 's-1')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that revoking a nonexistent session throws NOT_FOUND
   */
  it('- should throw NOT_FOUND when session does not exist', async () => {
    mockRepo.deleteSession.mockResolvedValue(false);
    await expect(profileService.revokeSession('u-1', 's-1')).rejects.toThrow('Session not found');
  });

  /**
   * Purpose: Validates that the repository is called with correct userId and sessionId
   */
  it('- should call repo with userId and sessionId', async () => {
    mockRepo.deleteSession.mockResolvedValue(true);
    await profileService.revokeSession('u-1', 's-2');
    expect(mockRepo.deleteSession).toHaveBeenCalledWith('u-1', 's-2');
  });
});

describe('profileService.changePassword', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /**
   * Purpose: Validates that a password can be changed with correct current password
   */
  it('+ should change password successfully', async () => {
    mockRepo.changePassword.mockResolvedValue(true);
    await expect(profileService.changePassword('u-1', 'old', 'new')).resolves.toBeUndefined();
  });

  /**
   * Purpose: Validates that an error is thrown when the current password is wrong
   */
  it('- should throw when current password is incorrect', async () => {
    mockRepo.changePassword.mockResolvedValue(false);
    await expect(profileService.changePassword('u-1', 'wrong', 'new')).rejects.toThrow('Current password is incorrect');
  });

  /**
   * Purpose: Validates that the repository receives the correct arguments for password change
   */
  it('- should call repo with correct arguments', async () => {
    mockRepo.changePassword.mockResolvedValue(true);
    await profileService.changePassword('u-1', 'old', 'new');
    expect(mockRepo.changePassword).toHaveBeenCalledWith('u-1', 'old', 'new');
  });
});

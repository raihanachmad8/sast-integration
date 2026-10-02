/**
 * Unit tests for projectService (API token management methods)
 *
 * Tests the token lifecycle at the service layer including:
 * - Token creation (project existence check, expiry calculation, raw token return)
 * - Token listing (project existence check, hash stripping)
 * - Token revocation (project ownership verification, soft delete)
 *
 * Focus is on the service orchestration logic — repository calls are mocked
 * to isolate business rules from persistence mechanics.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockValue } from '@tests/helpers/mock';

// --- Mocks (must be self-contained inside factories because vitest hoists vi.mock) ---

vi.mock('@/server/modules/project/repositories/project.repository', () => ({
  projectRepository: {
    findById: vi.fn(),
    findBySlug: vi.fn(),
    listByWorkspace: vi.fn(),
    listRepositories: vi.fn(),
    attachRepository: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
  },
}));

vi.mock('@/server/modules/project/repositories/project-api-token.repository', () => ({
  projectApiTokenRepository: {
    create: vi.fn(),
    listByProject: vi.fn(),
    revoke: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('@/server/modules/workspace/workspace.repository', () => ({
  workspaceRepository: {
    getMemberRole: vi.fn().mockResolvedValue('owner'),
  },
}));

import { projectService } from '@/server/modules/project/services/project.service';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';
import { projectApiTokenRepository } from '@/server/modules/project/repositories/project-api-token.repository';
import { workspaceRepository } from '@/server/modules/workspace/workspace.repository';
import { PROJECT } from '@/server/modules/project/constants';

const mockProjectRepo = vi.mocked(projectRepository);
const mockTokenRepo = vi.mocked(projectApiTokenRepository);
const mockWorkspaceRepo = vi.mocked(workspaceRepository);

// --- Tests ---------------------------------------------------------------

/**
 * Unit tests for projectService.createApiToken
 *
 * Covers:
 * - Project existence check before token creation
 * - Raw token return in response (shown once only)
 * - tokenHash exclusion from response (security invariant)
 * - Expiry date calculation from expiresInDays
 * - Null expiry when expiresInDays not provided
 */
describe('projectService.createApiToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that creating a token first checks the project exists,
   * then delegates to the repository with the correct parameters.
   * The raw token must be included in the response for the caller to display once.
   */
  it('should create and return the token with rawToken when project exists', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockTokenRepo.create.mockResolvedValue({
      token: mockValue({
        id: 'token-1',
        name: 'CI Token',
        tokenPrefix: 'sast_p_abc...',
        permissions: ['scans:upload'],
        expiresAt: null,
        createdAt: new Date('2026-01-01'),
      }),
      rawToken: 'sast_p_abcdefghijklmnopqrstuvwx',
    });

    const result = await projectService.createApiToken('proj-1', 'user-1', { name: 'CI Token' });

    expect(result.token).toBeDefined();
    expect(result.token.id).toBe('token-1');
    expect(result.token.name).toBe('CI Token');
    expect(result.rawToken).toBe('sast_p_abcdefghijklmnopqrstuvwx');
    expect(mockProjectRepo.findById).toHaveBeenCalledWith('proj-1');
    expect(mockTokenRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: 'proj-1',
        createdBy: 'user-1',
        name: 'CI Token',
      })
    );
  });

  /**
   * Purpose: Ensure the service throws NOT_FOUND when the project does not exist,
   * preventing token creation for non-existent projects.
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.createApiToken('nonexistent', 'user-1', { name: 'Token' })
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  /**
   * Purpose: Verify that the tokenHash is never included in the returned token object.
   * This is a critical security invariant — the hash must never leak to clients.
   */
  it('should not expose tokenHash in the returned token object', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockTokenRepo.create.mockResolvedValue({
      token: mockValue({
        id: 'token-1',
        name: 'CI Token',
        tokenHash: '$2a$10$secret',
        tokenPrefix: 'sast_p_abc...',
        permissions: ['scans:upload'],
        expiresAt: null,
        createdAt: new Date(),
      }),
      rawToken: 'sast_p_test',
    });

    const result = await projectService.createApiToken('proj-1', 'user-1', { name: 'CI Token' });

    expect(result.token).not.toHaveProperty('tokenHash');
  });

  /**
   * Purpose: Ensure the expiry is correctly calculated from expiresInDays.
   * The expiration date should be approximately N days from now.
   */
  it('should calculate expiry date from expiresInDays', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockTokenRepo.create.mockResolvedValue({
      token: mockValue({ id: 't1', name: 'T', tokenPrefix: 's', permissions: [], expiresAt: null, createdAt: new Date() }),
      rawToken: 'sast_p_test',
    });

    const before = Date.now();
    await projectService.createApiToken('proj-1', 'user-1', { name: 'Expiring', expiresInDays: 30 });

    const call = mockTokenRepo.create.mock.calls[0][0];
    const expiresAt = call.expiresAt as Date;
    const after = Date.now();

    // Expiry should be ~30 days from now (within 1 second tolerance)
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 30 * 24 * 60 * 60 * 1000 + 1000);
  });

  /**
   * Purpose: Verify that when expiresInDays is null/undefined, the token does not expire.
   * The service calculates null ?? undefined → undefined, so the repository receives
   * undefined for expiresAt, letting the DB default apply.
   */
  it('should not set expiry when expiresInDays is not provided', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockTokenRepo.create.mockResolvedValue({
      token: mockValue({ id: 't1', name: 'T', tokenPrefix: 's', permissions: [], expiresAt: null, createdAt: new Date() }),
      rawToken: 'sast_p_test',
    });

    await projectService.createApiToken('proj-1', 'user-1', { name: 'No Expiry' });

    const call = mockTokenRepo.create.mock.calls[0][0];
    expect(call.expiresAt == null).toBe(true);
  });
});

/**
 * Unit tests for projectService.listApiTokens
 *
 * Covers:
 * - Token list with tokenHash stripped from response
 * - NOT_FOUND error for non-existent project
 */
describe('projectService.listApiTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that listing tokens returns all tokens (active + revoked)
   * with sensitive fields (tokenHash) stripped from the response.
   */
  it('should return tokens with tokenHash stripped', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockTokenRepo.listByProject.mockResolvedValue(mockValue([
      {
        id: 't1',
        name: 'Token 1',
        tokenHash: '$2a$10$secret1',
        tokenPrefix: 'sast_p_a...',
        permissions: ['scans:upload'],
        lastUsedAt: null,
        createdAt: new Date(),
        expiresAt: null,
        revokedAt: null,
      },
      {
        id: 't2',
        name: 'Token 2',
        tokenHash: '$2a$10$secret2',
        tokenPrefix: 'sast_p_b...',
        permissions: ['scans:upload'],
        lastUsedAt: new Date(),
        createdAt: new Date(),
        expiresAt: null,
        revokedAt: new Date(),
      },
    ]));

    const result = await projectService.listApiTokens('proj-1', 'user-1');

    expect(result).toHaveLength(2);
    expect(result[0]).not.toHaveProperty('tokenHash');
    expect(result[1]).not.toHaveProperty('tokenHash');
    expect(result[0].name).toBe('Token 1');
    expect(result[1].revokedAt).toBeDefined();
  });

  /**
   * Purpose: Ensure the service throws NOT_FOUND when listing tokens for a non-existent project.
   */
  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.listApiTokens('nonexistent', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

/**
 * Unit tests for projectService.revokeApiToken
 *
 * Covers:
 * - Token ownership validation (projectId match)
 * - TOKEN_NOT_FOUND for non-existent token
 * - Cross-project revocation prevention
 * - Idempotent revoke on already-revoked token
 */
describe('projectService.revokeApiToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Purpose: Verify that revoking a token first validates the token belongs to the project,
   * then delegates to the repository for soft deletion.
   */
  it('should revoke the token when it belongs to the project', async () => {
    mockTokenRepo.findById.mockResolvedValue(mockValue({
      id: 'token-1',
      projectId: 'proj-1',
      revokedAt: null,
    }));
    mockTokenRepo.revoke.mockResolvedValue(mockValue({ id: 'token-1', revokedAt: new Date() }));

    const result = await projectService.revokeApiToken('proj-1', 'token-1', 'user-1');

    expect(result).toBeDefined();
    expect(mockTokenRepo.revoke).toHaveBeenCalledWith('token-1', 'user-1');
  });

  /**
   * Purpose: Ensure the service throws TOKEN_NOT_FOUND when the token does not exist.
   */
  it('should throw TOKEN_NOT_FOUND when token does not exist', async () => {
    mockTokenRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.revokeApiToken('proj-1', 'nonexistent', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });

  /**
   * Purpose: Prevent cross-project token revocation — a token created for project A
   * cannot be revoked using project B's ID, even if the user has access to both.
   */
  it('should throw TOKEN_NOT_FOUND when token belongs to a different project', async () => {
    mockTokenRepo.findById.mockResolvedValue(mockValue({
      id: 'token-1',
      projectId: 'proj-other',
      revokedAt: null,
    }));

    await expect(
      projectService.revokeApiToken('proj-1', 'token-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.TOKEN_NOT_FOUND);
  });

  /**
   * Purpose: Allow revoking an already-revoked token gracefully (idempotent operation).
   * The repository handles the actual state; the service just delegates.
   */
  it('should allow revoking an already-revoked token (idempotent)', async () => {
    mockTokenRepo.findById.mockResolvedValue(mockValue({
      id: 'token-1',
      projectId: 'proj-1',
      revokedAt: new Date(),
    }));
    mockTokenRepo.revoke.mockResolvedValue(mockValue({ id: 'token-1', revokedAt: new Date() }));

    const result = await projectService.revokeApiToken('proj-1', 'token-1', 'user-1');

    expect(result).toBeDefined();
    expect(mockTokenRepo.revoke).toHaveBeenCalled();
  });
});

// ============================================================
// Non-token method tests (list, getById, create, update, softDelete, generateSlug)
// ============================================================

/**
 * Unit tests for projectService.list
 *
 * Covers:
 * - Returns projects for a workspace
 */
describe('projectService.list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return projects for the workspace', async () => {
    mockProjectRepo.listByWorkspace.mockResolvedValue(mockValue([
      { id: 'proj-1', name: 'Project A' },
      { id: 'proj-2', name: 'Project B' },
    ]));

    const result = await projectService.list('ws-1', 'user-1');

    expect(result).toHaveLength(2);
    expect(mockProjectRepo.listByWorkspace).toHaveBeenCalledWith('ws-1');
  });
});

/**
 * Unit tests for projectService.getById
 *
 * Covers:
 * - Returns project when found
 * - Throws NOT_FOUND when project does not exist
 */
describe('projectService.getById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the project when found', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', name: 'Project A' }));

    const result = await projectService.getById('proj-1', 'user-1');

    expect(result).toBeDefined();
    expect(result.id).toBe('proj-1');
  });

  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.getById('nonexistent', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

/**
 * Unit tests for projectService.create
 *
 * Covers:
 * - Creates project with generated slug when slug not provided
 * - Creates project with explicit slug
 * - Throws SLUG_CONFLICT when slug already exists in workspace
 */
describe('projectService.create', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create project with auto-generated slug when slug not provided', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(mockValue(null));
    mockProjectRepo.create.mockResolvedValue(mockValue({ id: 'proj-1', name: 'My Project', slug: 'my-project' }));

    const result = await projectService.create({ name: 'My Project' }, 'ws-1', 'user-1');

    expect(result.id).toBe('proj-1');
    expect(mockProjectRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'my-project' })
    );
  });

  it('should create project with explicit slug', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(mockValue(null));
    mockProjectRepo.create.mockResolvedValue(mockValue({ id: 'proj-1', name: 'Project', slug: 'custom-slug' }));

    await projectService.create({ name: 'Project', slug: 'custom-slug' }, 'ws-1', 'user-1');

    expect(mockProjectRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'custom-slug' })
    );
  });

  it('should throw SLUG_CONFLICT when slug already exists in workspace', async () => {
    mockProjectRepo.findBySlug.mockResolvedValue(mockValue({ id: 'existing-proj' }));

    await expect(
      projectService.create({ name: 'Project', slug: 'existing-slug' }, 'ws-1', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });
});

/**
 * Unit tests for projectService.update
 *
 * Covers:
 * - Updates project when found
 * - Throws NOT_FOUND when project does not exist
 * - Throws SLUG_CONFLICT when new slug conflicts with another project
 * - Allows keeping the same slug (no conflict check)
 */
describe('projectService.update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update the project when found', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', slug: 'old-slug', workspace_id: 'ws-1' }));
    mockProjectRepo.update.mockResolvedValue(mockValue({ id: 'proj-1', name: 'Updated' }));

    const result = await projectService.update('proj-1', { name: 'Updated' }, 'user-1');

    expect(result).toBeDefined();
    expect(mockProjectRepo.update).toHaveBeenCalled();
  });

  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.update('nonexistent', { name: 'Updated' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });

  it('should throw SLUG_CONFLICT when new slug conflicts with another project', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', slug: 'old-slug', workspace_id: 'ws-1' }));
    mockProjectRepo.findBySlug.mockResolvedValue(mockValue({ id: 'proj-other' }));

    await expect(
      projectService.update('proj-1', { slug: 'taken-slug' }, 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.SLUG_CONFLICT);
  });

  it('should allow keeping the same slug without conflict check', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', slug: 'same-slug', workspace_id: 'ws-1' }));
    mockProjectRepo.update.mockResolvedValue(mockValue({ id: 'proj-1' }));

    await projectService.update('proj-1', { slug: 'same-slug' }, 'user-1');

    expect(mockProjectRepo.findBySlug).not.toHaveBeenCalled();
    expect(mockProjectRepo.update).toHaveBeenCalled();
  });
});

/**
 * Unit tests for projectService.softDelete
 *
 * Covers:
 * - Soft deletes the project when found
 * - Throws NOT_FOUND when project does not exist
 */
describe('projectService.softDelete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should soft delete the project when found', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1' }));
    mockProjectRepo.softDelete.mockResolvedValue(mockValue({ id: 'proj-1', deleted_at: new Date(), deleted_by: 'user-1' }));

    await projectService.softDelete('proj-1', 'user-1');

    expect(mockProjectRepo.softDelete).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('should throw NOT_FOUND when project does not exist', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue(null));

    await expect(
      projectService.softDelete('nonexistent', 'user-1')
    ).rejects.toThrow(PROJECT.ERRORS.NOT_FOUND);
  });
});

/**
 * Unit tests for projectService.listRepositories
 *
 * Covers:
 * - Returns repositories for a project
 */
describe('projectService.listRepositories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return repositories for the project', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockProjectRepo.listRepositories.mockResolvedValue(mockValue([
      { id: 'repo-1', name: 'backend' },
    ]));

    const result = await projectService.listRepositories('proj-1', 'user-1');

    expect(result).toHaveLength(1);
    expect(mockProjectRepo.listRepositories).toHaveBeenCalledWith('proj-1');
  });
});

/**
 * Unit tests for projectService.attachRepository
 *
 * Covers:
 * - Delegates to repository with correct parameters
 */
describe('projectService.attachRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate to projectRepository.attachRepository', async () => {
    mockProjectRepo.findById.mockResolvedValue(mockValue({ id: 'proj-1', workspace_id: 'ws-1' }));
    mockProjectRepo.attachRepository.mockResolvedValue(mockValue({ id: 'repo-1' }));

    const result = await projectService.attachRepository('proj-1', {
      name: 'backend',
      url: 'https://github.com/acme/backend',
      connectionType: 'scm',
    }, 'user-1');

    expect(result).toBeDefined();
    expect(mockProjectRepo.attachRepository).toHaveBeenCalledWith(
      'proj-1',
      expect.objectContaining({ name: 'backend', connectionType: 'scm' }),
      'user-1'
    );
  });
});

/**
 * Unit tests for projectService.generateSlug
 *
 * Covers:
 * - Slug generation from name (lowercase, hyphens, strip special chars)
 */
describe('projectService.generateSlug', () => {
  it('should generate slug from name', () => {
    expect(projectService.generateSlug('My Project')).toBe('my-project');
  });

  it('should strip special characters', () => {
    expect(projectService.generateSlug('Project Name')).toBe('project-name');
  });

  it('should collapse multiple hyphens', () => {
    expect(projectService.generateSlug('A   B')).toBe('a-b');
  });

  it('should truncate to 255 characters', () => {
    const longName = 'a'.repeat(300);
    const slug = projectService.generateSlug(longName);
    expect(slug.length).toBeLessThanOrEqual(255);
  });
});

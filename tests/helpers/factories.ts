export function createMockUser(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'user-1', email: 'test@example.com', name: 'Test User',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01',
    avatarUrl: null, twoFactorSecret: null, twoFactorConfirmedAt: null,
    emailVerifiedAt: new Date(), currentWorkspaceId: 'ws-1',
    rememberToken: null, createdAt: new Date(), updatedAt: new Date(),
    deletedAt: null, deletedBy: null,
    ...overrides,
  };
}

export function createMockWorkspace(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'ws-1', name: 'Test Workspace', slug: 'test-workspace',
    type: 'organization' as const, description: null, avatarUrl: null,
    createdBy: 'user-1', updatedBy: 'user-1',
    createdAt: new Date(), updatedAt: new Date(),
    deletedAt: null, deletedBy: null,
    ...overrides,
  };
}

export function createMockFinding(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'f1', scanId: 'scan-1', groupId: 'g1', severity: 'high' as const,
    status: 'open' as const, filePath: 'src/app.ts', lineNumber: 42,
    codeSnippet: 'const x = userInput;', description: 'Potential SQL injection',
    rule: 'sql-injection', scanner: 'semgrep', message: 'User input flows into SQL query',
    cweId: 'CWE-89', assignedTo: null,
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockScan(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'scan-1', repositoryId: 'repo-1', branch: 'main',
    status: 'completed' as const, origin: 'managed' as const,
    commitSha: 'abc123def456', prNumber: null, baseBranch: null,
    headBranch: null, prAuthor: null,
    startedAt: new Date(Date.now() - 60000), completedAt: new Date(),
    progressEvents: [], createdBy: 'user-1',
    createdAt: new Date(Date.now() - 60000), updatedAt: new Date(),
    ...overrides,
  };
}

export function createMockProject(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'proj-1', workspaceId: 'ws-1', name: 'Test Project', slug: 'test-project',
    description: null, platform: null, language: null, avatarUrl: null,
    createdBy: 'user-1', updatedBy: 'user-1',
    createdAt: new Date(), updatedAt: new Date(), deletedAt: null, deletedBy: null,
    ...overrides,
  };
}

export function createMockSession(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'session-1', userId: 'user-1', ipAddress: null, userAgent: null,
    currentRefreshTokenId: 'refresh-token-1',
    lastActivity: new Date(), createdAt: new Date(),
    ...overrides,
  };
}

export function createMockInvitation(overrides?: Partial<Record<string, unknown>>) {
  return {
    id: 'inv-1', email: 'invitee@example.com', role: 'member' as const,
    workspaceId: 'ws-1', createdBy: 'user-1', token: 'invitation-token-abc123',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: null, createdAt: new Date(),
    ...overrides,
  };
}

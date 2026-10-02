const profileBase = ['profile'] as const;

export const profileKeys = {
  all: profileBase,
  profile: [...profileBase, 'profile'] as const,
  sessions: [...profileBase, 'sessions'] as const,
  auditLog: [...profileBase, 'auditLog'] as const,
};

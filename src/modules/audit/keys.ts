export const auditKeys = {
  all: ['audit'] as const,
  logs: () => [...auditKeys.all, 'logs'] as const,
  activity: () => [...auditKeys.all, 'activity'] as const,
};

export const scheduleKeys = {
  all: ['schedules'] as const,
  lists: () => [...scheduleKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...scheduleKeys.all, 'list', workspaceId] as const,
  detail: (workspaceId: string, scheduleId: string) => [...scheduleKeys.all, 'detail', workspaceId, scheduleId] as const,
};

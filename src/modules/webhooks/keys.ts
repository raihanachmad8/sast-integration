export const webhookKeys = {
  all: ['webhooks'] as const,
  lists: () => [...webhookKeys.all, 'list'] as const,
  detail: (id: string) => [...webhookKeys.all, 'detail', id] as const,
};

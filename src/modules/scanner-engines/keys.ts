export const scannerEngineKeys = {
  all: ['scanner-engines'] as const,
  list: () => [...scannerEngineKeys.all, 'list'] as const,
  detail: (id: string) => [...scannerEngineKeys.all, 'detail', id] as const,
  rules: (id: string) => [...scannerEngineKeys.all, 'rules', id] as const,
};

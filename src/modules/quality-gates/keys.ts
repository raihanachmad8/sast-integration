export const qualityGateKeys = {
  all: ['quality-gates'] as const,
  config: (workspaceId: string) => [...qualityGateKeys.all, 'config', workspaceId] as const,
  results: (workspaceId: string) => [...qualityGateKeys.all, 'results', workspaceId] as const,
};

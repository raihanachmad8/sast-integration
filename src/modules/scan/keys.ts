import type { ListParams } from '@/commons/types/pagination';

/**
 * TanStack Query key factory for the scan module.
 *
 * @example
 * ```ts
 * // Invalidate all scan queries
 * queryClient.invalidateQueries({ queryKey: scanKeys.all });
 *
 * // Invalidate a specific scan detail
 * queryClient.invalidateQueries({ queryKey: scanKeys.detail('scan-100') });
 *
 * // Invalidate scan findings
 * queryClient.invalidateQueries({ queryKey: scanKeys.findings('scan-100') });
 * ```
 */
export const scanKeys = {
  /** Root key — invalidates all scan-related queries. */
  all: ['scans'] as const,
  /** Key for the scan list. */
  list: (params?: ListParams) => [...scanKeys.all, 'list', params] as const,
  /** Key for a single scan detail. */
  detail: (id: string) => [...scanKeys.all, 'detail', id] as const,
  /** Key for findings within a specific scan. */
  findings: (scanId: string) => [...scanKeys.all, 'findings', scanId] as const,
  /** Key for scanner availability check. */
  availability: () => [...scanKeys.all, 'availability'] as const,
  /** Key for repository branches. */
  branches: (repoId: string) => [...scanKeys.all, 'branches', repoId] as const,
};

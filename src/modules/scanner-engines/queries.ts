'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { scannerEngineKeys } from './keys';
import { scannerEnginesApi } from './api';
import { STALE } from '@/commons/constants/query';

/**
 * Query hook for fetching all available scanner engines.
 * Uses keepPreviousData to prevent flicker while the list refreshes.
 *
 * @example
 * ```tsx
 * const { data: engines, isLoading } = useScannerEnginesQuery();
 * ```
 */
export function useScannerEnginesQuery() {
  return useQuery({
    queryKey: scannerEngineKeys.list(),
    queryFn: () => scannerEnginesApi.list(),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

/**
 * Query hook for fetching rules for a specific scanner engine.
 * Supports pagination and search filtering.
 *
 * @param scannerId - The scanner engine ID to fetch rules for.
 * @param options - Optional query options for filtering and pagination.
 * @param options.enabled - Whether the query is enabled. Defaults to true.
 * @param options.page - Page number for pagination.
 * @param options.perPage - Number of results per page.
 * @param options.search - Search term to filter rules.
 *
 * @example
 * ```tsx
 * const { data: rules } = useScannerRulesQuery('engine-1', { page: 1, search: 'injection' });
 * ```
 */
export function useScannerRulesQuery(
  scannerId: string,
  options?: { enabled?: boolean; page?: number; perPage?: number; search?: string },
) {
  return useQuery({
    queryKey: [...scannerEngineKeys.rules(scannerId), { page: options?.page, perPage: options?.perPage, search: options?.search }],
    queryFn: () => scannerEnginesApi.getRules(scannerId, { page: options?.page, perPage: options?.perPage, search: options?.search }),
    enabled: options?.enabled !== false && !!scannerId,
    staleTime: STALE.DEFAULT,
  });
}

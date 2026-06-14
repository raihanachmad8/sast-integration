'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { scannerEngineKeys } from './keys';
import { scannerEnginesApi } from './api';
import { STALE } from '@/commons/constants/query';

export function useScannerEnginesQuery() {
  return useQuery({
    queryKey: scannerEngineKeys.list(),
    queryFn: () => scannerEnginesApi.list(),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

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

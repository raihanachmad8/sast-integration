'use client';

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { scannerEngineKeys } from './keys';
import { scannerEnginesApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';

export function useScannerEnginesQuery(params: ListParams) {
  return useQuery({
    queryKey: scannerEngineKeys.list(params),
    queryFn: () => scannerEnginesApi.list(params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
  });
}

export function useScannerRulesQuery(scannerId: string) {
  return useQuery({
    queryKey: scannerEngineKeys.rules(scannerId),
    queryFn: () => scannerEnginesApi.getRules(scannerId),
    enabled: !!scannerId,
    staleTime: STALE.DEFAULT,
  });
}

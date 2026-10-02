'use client';

import { useQuery } from '@tanstack/react-query';
import { scannerEngineKeys } from './keys';
import { listScannerEngines, getScannerRules } from './api';

export function useScannerEnginesQuery() {
  return useQuery({
    queryKey: scannerEngineKeys.list(),
    queryFn: listScannerEngines,
  });
}

export function useScannerRulesQuery(scannerId: string, enabled = true) {
  return useQuery({
    queryKey: scannerEngineKeys.rules(scannerId),
    queryFn: () => getScannerRules(scannerId),
    enabled: enabled && scannerId.length > 0,
  });
}

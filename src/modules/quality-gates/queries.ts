'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qualityGatesApi } from './api';
import { qualityGateKeys } from './keys';

/** @example const { data } = use...(); */
export function useQualityGateConfigQuery(workspaceId: string) {
  return useQuery({
    queryKey: qualityGateKeys.config(workspaceId),
    queryFn: () => qualityGatesApi.getConfig(workspaceId),
    enabled: !!workspaceId,
  });
}

/** @example const { data } = use...(); */
export function useUpdateQualityGateMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<{ threshold: string; fail_on_critical: boolean; fail_on_high_tp: boolean; warn_on_pending: boolean; require_human_ack: boolean; pending_behavior: string }>) =>
      qualityGatesApi.updateConfig(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qualityGateKeys.config(workspaceId) });
    },
  });
}

/** @example const { data } = use...(); */
export function useQualityGateResultsQuery(workspaceId: string) {
  return useQuery({
    queryKey: qualityGateKeys.results(workspaceId),
    queryFn: () => qualityGatesApi.getResults(workspaceId),
    enabled: !!workspaceId,
  });
}

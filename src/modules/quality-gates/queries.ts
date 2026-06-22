'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityGateKeys } from './keys';
import { qualityGatesApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';

/**
 * Query hook for fetching the active quality gate configuration.
 * Returns the current rules and thresholds applied to the workspace.
 */
export function useQualityGateConfigQuery() {
  return useQuery({ queryKey: qualityGateKeys.config(), queryFn: () => qualityGatesApi.getConfig(), staleTime: STALE.DEFAULT });
}

/**
 * Mutation hook for updating the quality gate configuration.
 * Invalidates the config query on success.
 */
export function useUpdateQualityGateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QualityGateConfigInput) => qualityGatesApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qualityGateKeys.config() });
    },
  });
}

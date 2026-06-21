'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityGateKeys } from './keys';
import { qualityGatesApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';

/**
 * Query hook for fetching all quality gates in the workspace.
 * Returns the full list of quality gate definitions.
 *
 * @example
 * ```tsx
 * const { data: gates, isLoading } = useQualityGatesQuery();
 * ```
 */
export function useQualityGatesQuery() {
  return useQuery({ queryKey: qualityGateKeys.list(), queryFn: () => qualityGatesApi.list(), staleTime: STALE.DEFAULT });
}

/**
 * Query hook for fetching the active quality gate configuration.
 * Returns the current rules and thresholds applied to the workspace.
 *
 * @example
 * ```tsx
 * const { data: config } = useQualityGateConfigQuery();
 * console.log(config?.thresholds); // { critical: 0, high: 3, ... }
 * ```
 */
export function useQualityGateConfigQuery() {
  return useQuery({ queryKey: qualityGateKeys.config(), queryFn: () => qualityGatesApi.getConfig(), staleTime: STALE.DEFAULT });
}

/**
 * Mutation hook for updating the quality gate configuration.
 * Invalidates both the config and list queries on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateQualityGateMutation();
 * updateMutation.mutate({ thresholds: { critical: 0 } });
 * ```
 */
export function useUpdateQualityGateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: QualityGateConfigInput) => qualityGatesApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qualityGateKeys.config() });
      qc.invalidateQueries({ queryKey: qualityGateKeys.list() });
    },
  });
}

/**
 * Query hook for fetching quality gate evaluation results.
 * Returns pass/fail outcomes from the most recent quality gate run.
 *
 * @example
 * ```tsx
 * const { data: results } = useQualityGateResultsQuery();
 * console.log(results?.passed); // true/false
 * ```
 */
export function useQualityGateResultsQuery() {
  return useQuery({ queryKey: qualityGateKeys.results(), queryFn: () => qualityGatesApi.getResults(), staleTime: STALE.DEFAULT });
}

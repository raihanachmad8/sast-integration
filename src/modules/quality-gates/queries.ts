'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { STALE } from '@/commons/constants/query';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';
import { useWorkspace } from '@/lib/hooks/useWorkspace';

import { qualityGatesApi } from './api';
import { qualityGateKeys } from './keys';

/**
 * Query hook for fetching the active quality gate configuration.
 * Returns the current rules and thresholds applied to the workspace.
 */
export function useQualityGateConfigQuery() {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: qualityGateKeys.config(workspaceId!),
    queryFn: () => qualityGatesApi.getConfig(),
    staleTime: STALE.DEFAULT,
    enabled: !!workspaceId,
  });
}

/**
 * Mutation hook for updating the quality gate configuration.
 * Invalidates the config query on success.
 */
export function useUpdateQualityGateMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: QualityGateConfigInput) => qualityGatesApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qualityGateKeys.config(workspaceId!) });
    },
  });
}

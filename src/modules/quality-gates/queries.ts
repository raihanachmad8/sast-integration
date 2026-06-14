'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { qualityGateKeys } from './keys';
import { qualityGatesApi } from './api';
import { STALE } from '@/commons/constants/query';
import type { QualityGateConfigInput } from '@/commons/schemas/quality-gate.schema';

export function useQualityGatesQuery() {
  return useQuery({ queryKey: qualityGateKeys.list(), queryFn: () => qualityGatesApi.list(), staleTime: STALE.DEFAULT });
}

export function useQualityGateConfigQuery() {
  return useQuery({ queryKey: qualityGateKeys.config(), queryFn: () => qualityGatesApi.getConfig(), staleTime: STALE.DEFAULT });
}

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

export function useQualityGateResultsQuery() {
  return useQuery({ queryKey: qualityGateKeys.results(), queryFn: () => qualityGatesApi.getResults(), staleTime: STALE.DEFAULT });
}

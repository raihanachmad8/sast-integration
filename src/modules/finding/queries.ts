'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { findingKeys } from './keys';
import { listFindings, getFinding, updateFinding, bulkUpdateFindings, runAiVerification, listMembers, listModels } from './api';
import type { Finding } from '@/commons/types';

function useInvalidateFindingDependencies() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: findingKeys.all }),
    ]);
}

export function useFindingsQuery() {
  return useQuery({
    queryKey: findingKeys.all,
    queryFn: listFindings,
  });
}

export function useFindingQuery(id: string, enabled = true) {
  return useQuery({
    queryKey: findingKeys.detail(id),
    queryFn: () => getFinding(id),
    enabled: enabled && id.length > 0,
  });
}

export function useUpdateFindingMutation() {
  const invalidate = useInvalidateFindingDependencies();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Finding> }) =>
      updateFinding(id, payload),
    onSuccess: invalidate,
  });
}

export function useBulkUpdateFindingsMutation() {
  const invalidate = useInvalidateFindingDependencies();
  return useMutation({
    mutationFn: ({ ids, payload }: { ids: string[]; payload: Partial<Finding> }) =>
      bulkUpdateFindings(ids, payload),
    onSuccess: invalidate,
  });
}

export function useRunAiVerificationMutation() {
  const invalidate = useInvalidateFindingDependencies();
  return useMutation({
    mutationFn: (findingIds: string[]) => runAiVerification(findingIds),
    onSuccess: invalidate,
  });
}

export function useMembersQuery() {
  return useQuery({
    queryKey: findingKeys.lists(),
    queryFn: listMembers,
  });
}

export function useModelsQuery() {
  return useQuery({
    queryKey: ['model'],
    queryFn: listModels,
  });
}

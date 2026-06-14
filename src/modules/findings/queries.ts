'use client';

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { STALE } from '@/commons/constants/query';
import { findingKeys } from './keys';
import { findingsApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import type { FindingListParams } from './types';

type UpdateFindingPayload = {
  severity?: string;
  verdict?: string;
  status?: string;
  notes?: string;
};

type BulkUpdateFindingsPayload = {
  severity?: string;
  verdict?: string;
  status?: string;
};

export function useFindingsQuery(params: FindingListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.list(params),
    queryFn: () => findingsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

export function useFindingGroupsQuery(projectId: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.groups(projectId),
    queryFn: () => findingsApi.listGroups(workspaceId!, projectId),
    enabled: !!projectId && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

export function useFindingQuery(id: string) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: findingKeys.detail(id),
    queryFn: () => findingsApi.get(workspaceId!, id),
    enabled: !!id && !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

export function useUpdateFindingMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateFindingPayload }) =>
      findingsApi.update(workspaceId!, id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

export function useBulkUpdateFindingsMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ ids, payload }: { ids: string[]; payload: BulkUpdateFindingsPayload }) =>
      findingsApi.bulkUpdate(workspaceId!, ids, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

export function useRunAiVerificationMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (findingIds: string[]) => findingsApi.aiVerify(workspaceId!, findingIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

export function useVerifyFindingMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (findingId: string) => {
      const _api = Api({ baseUrl: clientEnv.apiUrl });
      return _api.Post<ApiResponse<{ result: unknown }>>(
        ENDPOINTS.FINDINGS.VERIFY(workspaceId!, findingId),
        {}
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: findingKeys.all });
    },
  });
}

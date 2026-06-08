'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { scanProfileKeys } from './keys';
import { scanProfilesApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateScanProfileInput, UpdateScanProfileInput } from '@/commons/schemas/scan-profile.schema';

export function useScanProfilesQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: scanProfileKeys.list(params),
    queryFn: () => scanProfilesApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

export function useCreateScanProfileMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateScanProfileInput) =>
      scanProfilesApi.create(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scanProfileKeys.list() }),
  });
}

export function useUpdateScanProfileMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateScanProfileInput }) =>
      scanProfilesApi.update(workspaceId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: scanProfileKeys.list() }),
  });
}

export function useDeleteScanProfileMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => scanProfilesApi.delete(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: scanProfileKeys.list() }),
  });
}

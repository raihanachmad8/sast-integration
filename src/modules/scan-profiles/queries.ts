'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { scanProfileKeys } from './keys';
import {
  listScanProfiles,
  createScanProfile,
  updateScanProfile,
  deleteScanProfile,
} from './api';
import type { ScanProfile } from './api';

export function useScanProfilesQuery(workspaceId: string) {
  return useQuery({
    queryKey: scanProfileKeys.list(workspaceId),
    queryFn: () => listScanProfiles(workspaceId),
    enabled: workspaceId.length > 0,
  });
}

export function useCreateScanProfileMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ScanProfile>) => createScanProfile(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanProfileKeys.all });
    },
  });
}

export function useUpdateScanProfileMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScanProfile> }) =>
      updateScanProfile(workspaceId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanProfileKeys.all });
    },
  });
}

export function useDeleteScanProfileMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteScanProfile(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanProfileKeys.all });
    },
  });
}

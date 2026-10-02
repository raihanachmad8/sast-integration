'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { modelKeys } from './keys';
import { listAiModels, createAiModel, updateAiModel, deleteAiModel } from './api';
import type { AiModel } from './api';

export function useModelsListQuery(workspaceId: string) {
  return useQuery({
    queryKey: modelKeys.list(workspaceId),
    queryFn: () => listAiModels(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useCreateModelMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof createAiModel>[1]) => createAiModel(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelKeys.list(workspaceId) });
    },
  });
}

export function useUpdateModelMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AiModel> }) => updateAiModel(workspaceId, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelKeys.list(workspaceId) });
    },
  });
}

export function useDeleteModelMutation(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAiModel(workspaceId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: modelKeys.list(workspaceId) });
    },
  });
}

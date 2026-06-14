'use client';

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { aiModelKeys } from './keys';
import { aiModelsApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateAiModelInput } from '@/commons/schemas/ai-model.schema';

export function useAiModelsQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: aiModelKeys.list(params),
    queryFn: () => aiModelsApi.list(workspaceId!, params),
    staleTime: STALE.DEFAULT,
    placeholderData: keepPreviousData,
    enabled: !!workspaceId,
  });
}

export function useCreateAiModelMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateAiModelInput) => aiModelsApi.create(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiModelKeys.all }),
  });
}

export function useUpdateAiModelMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateAiModelInput> }) =>
      aiModelsApi.update(workspaceId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiModelKeys.all }),
  });
}

export function useDeleteAiModelMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.delete(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiModelKeys.all }),
  });
}

export function useTestAiModelMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => aiModelsApi.test(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: aiModelKeys.all }),
  });
}

'use client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { webhookKeys } from './keys';
import { webhooksApi } from './api';
import { useWorkspace } from '@/hooks/use-workspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateWebhookInput } from '@/commons/schemas/webhook.schema';

export function useWebhooksQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: webhookKeys.list(params), queryFn: () => webhooksApi.list(workspaceId!, params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData, enabled: !!workspaceId });
}

export function useCreateWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateWebhookInput) => webhooksApi.create(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useUpdateWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWebhookInput> }) => webhooksApi.update(workspaceId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useDeleteWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.delete(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

export function useTestWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.test(workspaceId!, id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['webhook-deliveries', id] });
    },
  });
}

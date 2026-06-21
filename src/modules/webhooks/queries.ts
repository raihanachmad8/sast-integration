'use client';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { webhookKeys } from './keys';
import { webhooksApi } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';
import type { ListParams } from '@/commons/types/pagination';
import type { CreateWebhookInput } from '@/commons/schemas/webhook.schema';

/**
 * Query hook for paginated webhooks in the current workspace.
 * Uses keepPreviousData to avoid flicker during page transitions.
 *
 * @param params - Pagination and filter parameters for webhook listing.
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useWebhooksQuery({ page: 1, perPage: 20 });
 * ```
 */
export function useWebhooksQuery(params: ListParams) {
  const { workspaceId } = useWorkspace();
  return useQuery({ queryKey: webhookKeys.list(params), queryFn: () => webhooksApi.list(workspaceId!, params), staleTime: STALE.DEFAULT, placeholderData: keepPreviousData, enabled: !!workspaceId });
}

/**
 * Mutation hook for creating a new webhook in the workspace.
 * Invalidates all webhook queries on success.
 *
 * @example
 * ```tsx
 * const createMutation = useCreateWebhookMutation();
 * createMutation.mutate({ url: 'https://example.com/hook', events: ['scan.completed'] });
 * ```
 */
export function useCreateWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (data: CreateWebhookInput) => webhooksApi.create(workspaceId!, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

/**
 * Mutation hook for updating an existing webhook.
 * Invalidates all webhook queries on success.
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateWebhookMutation();
 * updateMutation.mutate({ id: 'wh-1', data: { url: 'https://new-url.com/hook' } });
 * ```
 */
export function useUpdateWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateWebhookInput> }) => webhooksApi.update(workspaceId!, id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

/**
 * Mutation hook for deleting a webhook.
 * Invalidates all webhook queries on success.
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteWebhookMutation();
 * deleteMutation.mutate('wh-123');
 * ```
 */
export function useDeleteWebhookMutation() {
  const qc = useQueryClient();
  const { workspaceId } = useWorkspace();
  return useMutation({
    mutationFn: (id: string) => webhooksApi.delete(workspaceId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: webhookKeys.all }),
  });
}

/**
 * Mutation hook for sending a test payload to a webhook.
 * Invalidates the deliveries list for the specific webhook on success.
 *
 * @example
 * ```tsx
 * const testMutation = useTestWebhookMutation();
 * testMutation.mutate('wh-123');
 * ```
 */
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

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webhookKeys } from './keys';
import { listWebhooks, createWebhook, updateWebhook, deleteWebhook, testWebhook } from './api';
import type { Webhook } from './api';

/**
 * React Query hook to fetch the list of webhooks.
 * @returns The query result containing a list of webhooks.
 * @example
 * ```tsx
 * const { data: webhooks, isLoading } = useWebhooksQuery();
 * if (isLoading) return <LoadingState />;
 * return webhooks?.map((wh) => <WebhookCard key={wh.id} webhook={wh} />);
 * ```
 */
export function useWebhooksQuery() {
  return useQuery({
    queryKey: webhookKeys.lists(),
    queryFn: listWebhooks,
  });
}

/**
 * React Query mutation hook to create a new webhook.
 * Invalidates the webhook list query on success.
 * @returns The mutation result for creating a webhook.
 * @example
 * ```tsx
 * const { mutate: create } = useCreateWebhookMutation();
 * create({ name: 'CI Notifier', url: 'https://example.com/hook', events: ['scan.completed'] });
 * ```
 */
export function useCreateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}

/**
 * React Query mutation hook to update an existing webhook.
 * Performs optimistic updates with rollback on error.
 * @returns The mutation result for updating a webhook.
 * @example
 * ```tsx
 * const { mutate: update } = useUpdateWebhookMutation();
 * update({ id: 'wh-xyz789', data: { name: 'New Name', enabled: false } });
 * ```
 */
export function useUpdateWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Webhook> }) =>
      updateWebhook(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: webhookKeys.lists() });

      // Snapshot previous value
      const previousWebhooks = queryClient.getQueryData<Webhook[]>(webhookKeys.lists());

      // Optimistically update
      queryClient.setQueryData<Webhook[]>(webhookKeys.lists(), (old) =>
        old?.map((wh) => (wh.id === id ? { ...wh, ...data } : wh)) ?? []
      );

      // Return context with snapshot
      return { previousWebhooks };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousWebhooks) {
        queryClient.setQueryData(webhookKeys.lists(), context.previousWebhooks);
      }
    },
    onSettled: () => {
      // Refetch after error or success
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}

/**
 * React Query mutation hook to delete a webhook.
 * Performs optimistic removal with rollback on error.
 * @returns The mutation result for deleting a webhook.
 * @example
 * ```tsx
 * const { mutate: remove } = useDeleteWebhookMutation();
 * remove('wh-xyz789');
 * ```
 */
export function useDeleteWebhookMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteWebhook,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: webhookKeys.lists() });

      const previousWebhooks = queryClient.getQueryData<Webhook[]>(webhookKeys.lists());

      // Optimistically remove
      queryClient.setQueryData<Webhook[]>(webhookKeys.lists(), (old) =>
        old?.filter((wh) => wh.id !== id) ?? []
      );

      return { previousWebhooks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousWebhooks) {
        queryClient.setQueryData(webhookKeys.lists(), context.previousWebhooks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}

/**
 * React Query mutation hook to send a test event to a webhook.
 * @returns The mutation result for testing a webhook.
 * @example
 * ```tsx
 * const { mutate: test, isSuccess } = useTestWebhookMutation();
 * test('wh-xyz789');
 * if (isSuccess) toast.success('Webhook test passed');
 * ```
 */
export function useTestWebhookMutation() {
  return useMutation({
    mutationFn: testWebhook,
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workspaceSettingsApi, type PrReviewSettings } from './api';
import { useWorkspace } from '@/lib/hooks/useWorkspace';
import { STALE } from '@/commons/constants/query';

export type { PrReviewSettings };

const DEFAULT_PR_REVIEW_SETTINGS: PrReviewSettings = {
  postPrSummaryComment: true,
  inlineCodeAnnotations: true,
  publishQualityGateStatus: true,
  statusContext: 'sast-integration/gate',
  reviewSummaryFormat: 'compact',
};

export const workspaceSettingsKeys = {
  all: ['workspace-settings'] as const,
  prReview: (workspaceId: string) => [...workspaceSettingsKeys.all, 'pr-review', workspaceId] as const,
};

export function usePrReviewSettingsQuery() {
  const { workspaceId } = useWorkspace();

  return useQuery({
    queryKey: workspaceSettingsKeys.prReview(workspaceId ?? ''),
    queryFn: async (): Promise<PrReviewSettings> => {
      if (!workspaceId) return DEFAULT_PR_REVIEW_SETTINGS;
      try {
        return await workspaceSettingsApi.getPrReviewSettings(workspaceId);
      } catch {
        return DEFAULT_PR_REVIEW_SETTINGS;
      }
    },
    enabled: !!workspaceId,
    staleTime: STALE.DEFAULT,
  });
}

export function useUpdatePrReviewSettingsMutation() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PrReviewSettings>) => {
      if (!workspaceId) throw new Error('Workspace ID required');
      return workspaceSettingsApi.updatePrReviewSettings(workspaceId, settings);
    },
    onSuccess: () => {
      if (workspaceId) {
        queryClient.invalidateQueries({ queryKey: workspaceSettingsKeys.prReview(workspaceId) });
      }
    },
  });
}

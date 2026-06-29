import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { ApiResponse } from '@/commons/types/api';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';

import type { PrReviewSettings } from './types';

export type { PrReviewSettings };

const _api = Api({ baseUrl: clientEnv.apiUrl });

export const workspaceSettingsApi = {
  async getPrReviewSettings(workspaceId: string): Promise<PrReviewSettings> {
    const { data } = await _api.Get<ApiResponse<PrReviewSettings>>(
      `${ENDPOINTS.WORKSPACES.DETAIL(workspaceId)}/settings/pr-review`
    );
    return data;
  },

  async updatePrReviewSettings(workspaceId: string, settings: Partial<PrReviewSettings>): Promise<PrReviewSettings> {
    const { data } = await _api.Put<ApiResponse<PrReviewSettings>>(
      `${ENDPOINTS.WORKSPACES.DETAIL(workspaceId)}/settings/pr-review`,
      settings
    );
    return data;
  },
};

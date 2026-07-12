import { ENDPOINTS } from '@/commons/constants/endpoints';
import type { TeamWithSummary, TeamDetail } from '@/commons/types/team';
import type { ApiResponse } from '@/commons/types/api';
import type { PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { Api } from '@/lib/api/client';
import { extractPaginated } from '@/lib/api/pagination';

import type { TeamFormInput } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Teams API client — CRUD operations for workspace teams.
 * Team detail includes members (GET /teams/:id returns team + members).
 */
export const teamsApi = {
  /** Fetch all teams in the current workspace. */
  async list(workspaceId: string, params?: Record<string, unknown>): Promise<PaginatedResponse<TeamWithSummary>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<TeamWithSummary>>>(ENDPOINTS.TEAMS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  /** Fetch a single team by ID (includes members array). */
  async get(workspaceId: string, teamId: string): Promise<TeamDetail> {
    const { data } = await _api.Get<ApiResponse<TeamDetail>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, teamId));
    return data;
  },

  /** Create a new team. */
  async create(workspaceId: string, data: TeamFormInput): Promise<TeamWithSummary> {
    const { data: response } = await _api.Post<ApiResponse<TeamWithSummary>>(ENDPOINTS.TEAMS.LIST(workspaceId), data);
    return response;
  },

  /** Update an existing team. */
  async update(workspaceId: string, id: string, data: TeamFormInput): Promise<TeamWithSummary> {
    const { data: response } = await _api.Put<ApiResponse<TeamWithSummary>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, id), data);
    return response;
  },

  /** Delete a team by ID. */
  async delete(workspaceId: string, id: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, id));
  },
};

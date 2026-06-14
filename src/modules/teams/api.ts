import type { Team, TeamMember } from '@/commons/types';
import type { TeamFormInput } from './types';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Teams API client — CRUD operations for workspace teams and member management.
 *
 * @example
 * ```ts
 * import { teamsApi } from '@/modules/teams/api';
 *
 * const teams = await teamsApi.list('ws_01', { page: 1, perPage: 10 });
 * const members = await teamsApi.getMembers('ws_01', 'tm_01');
 * await teamsApi.create('ws_01', { name: 'New Team', slug: 'new-team', description: '', memberIds: [] });
 * ```
 */
export const teamsApi = {
  /**
   * Fetch all teams in the current workspace.
   * @param workspaceId - The workspace ID.
   * @param params - Pagination parameters.
   * @returns Paginated array of Team objects with member/project counts.
   *
   * @example
   * ```ts
   * const teams = await teamsApi.list('ws_01', { page: 1, perPage: 10 });
   * teams.data.forEach(t => console.log(`${t.name}: ${t.memberCount} members`));
   * ```
   */
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<Team>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<Team>>>(ENDPOINTS.TEAMS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  /**
   * Fetch a single team by ID.
   */
  async get(workspaceId: string, teamId: string): Promise<Team> {
    const { data } = await _api.Get<ApiResponse<Team>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, teamId));
    return data;
  },

  /**
   * Create a new team.
   * @param workspaceId - The workspace ID.
   * @param data - Team form input.
   * @returns The created Team object.
   *
   * @example
   * ```ts
   * const team = await teamsApi.create('ws_01', { name: 'Security', slug: 'security', description: 'Security reviews', memberIds: ['usr_01'] });
   * ```
   */
  async create(workspaceId: string, data: TeamFormInput): Promise<Team> {
    const { data: response } = await _api.Post<ApiResponse<Team>>(ENDPOINTS.TEAMS.LIST(workspaceId), data);
    return response;
  },

  /**
   * Update an existing team.
   * @param workspaceId - The workspace ID.
   * @param id - Team ID.
   * @param data - Updated team data.
   *
   * @example
   * ```ts
   * await teamsApi.update('ws_01', 'tm_01', { name: 'Security Core', slug: 'security-core', description: 'Updated', memberIds: [] });
   * ```
   */
  async update(workspaceId: string, id: string, data: TeamFormInput): Promise<Team> {
    const { data: response } = await _api.Put<ApiResponse<Team>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, id), data);
    return response;
  },

  /**
   * Fetch members of a specific team.
   * @param workspaceId - The workspace ID.
   * @param teamId - The team ID.
   * @returns Array of TeamMember objects with user details.
   *
   * @example
   * ```ts
   * const members = await teamsApi.getMembers('ws_01', 'tm_01');
   * members.forEach(m => console.log(`${m.name} (${m.email})`));
   * ```
   */
  async getMembers(workspaceId: string, teamId: string): Promise<TeamMember[]> {
    const { data } = await _api.Get<ApiResponse<TeamMember[]>>(ENDPOINTS.TEAMS.MEMBERS(workspaceId, teamId));
    return data;
  },

  /**
   * Delete a team by ID.
   * @param workspaceId - The workspace ID.
   * @param id - Team ID to delete.
   *
   * @example
   * ```ts
   * await teamsApi.delete('ws_01', 'tm_01');
   * ```
   */
  async delete(workspaceId: string, id: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.TEAMS.DETAIL(workspaceId, id));
  },
};

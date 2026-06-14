import type { Project } from '@/commons/types';
import type { ProjectFormInput } from './types';
import { extractPaginated } from '@/lib/api/pagination';
import type { ApiResponse } from '@/commons/types/api';
import type { ListParams, PaginatedResponse } from '@/commons/types/pagination';
import { clientEnv } from '@/config/client-env';
import { ENDPOINTS } from '@/commons/constants/endpoints';
import { Api } from '@/lib/api/client';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Projects API client — CRUD operations for security projects.
 *
 * @example
 * ```ts
 * import { projectsApi } from '@/modules/project/api';
 *
 * const projects = await projectsApi.list('ws_01', { page: 1, perPage: 10 });
 * const created = await projectsApi.create('ws_01', { name: 'New Project', description: '...', ... });
 * ```
 */
export const projectsApi = {
  /**
   * Fetch all projects in the current workspace.
   * @param workspaceId - The workspace ID.
   * @param params - Pagination parameters.
   * @returns Paginated array of Project objects with team/member/repo counts.
   *
   * @example
   * ```ts
   * const projects = await projectsApi.list('ws_01', { page: 1, perPage: 10 });
   * projects.data.forEach(p => console.log(`${p.name}: ${p.repositories.length} repos`));
   * ```
   */
  async list(workspaceId: string, params: ListParams): Promise<PaginatedResponse<Project>> {
    const response = await _api.Get<ApiResponse<PaginatedResponse<Project>>>(ENDPOINTS.PROJECTS.LIST(workspaceId), params);
    return extractPaginated(response);
  },

  /**
   * Fetch a single project by ID.
   */
  async get(workspaceId: string, projectId: string): Promise<Project> {
    const { data } = await _api.Get<ApiResponse<Project>>(ENDPOINTS.PROJECTS.DETAIL(workspaceId, projectId));
    return data;
  },

  /**
   * Create a new project.
   * @param workspaceId - The workspace ID.
   * @param data - Project form input.
   * @returns The created Project object.
   *
   * @example
   * ```ts
   * const project = await projectsApi.create('ws_01', {
   *   name: 'Payment Gateway',
   *   description: 'PCI-compliant payment processing',
   *   lead: 'Alice',
   *   teamIds: ['tm_01'],
   *   memberIds: ['usr_01'],
   *   repositoryIds: ['repo_01'],
   *   settings: { enforceQualityGate: true, notifyOnCritical: true, autoTriggerScan: false },
   * });
   * ```
   */
  async create(workspaceId: string, data: ProjectFormInput): Promise<Project> {
    const { data: response } = await _api.Post<ApiResponse<Project>>(ENDPOINTS.PROJECTS.LIST(workspaceId), data);
    return response;
  },

  /**
   * Update an existing project.
   * @param workspaceId - The workspace ID.
   * @param id - Project ID.
   * @param data - Updated project data.
   *
   * @example
   * ```ts
   * await projectsApi.update('ws_01', 'proj_01', { name: 'Backend API v2', description: 'Updated', ... });
   * ```
   */
  async update(workspaceId: string, id: string, data: ProjectFormInput): Promise<Project> {
    const { data: response } = await _api.Put<ApiResponse<Project>>(ENDPOINTS.PROJECTS.DETAIL(workspaceId, id), data);
    return response;
  },

  /**
   * Delete a project by ID.
   * @param workspaceId - The workspace ID.
   * @param id - Project ID to delete.
   *
   * @example
   * ```ts
   * await projectsApi.delete('ws_01', 'proj_01');
   * ```
   */
  async delete(workspaceId: string, id: string): Promise<void> {
    await _api.Delete<ApiResponse<null>>(ENDPOINTS.PROJECTS.DETAIL(workspaceId, id));
  },
};

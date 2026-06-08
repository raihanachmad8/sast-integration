/**
 * Project module — security project CRUD and management.
 *
 * @module projects
 *
 * @example
 * ```ts
 * import { projectsApi, useProjectsQuery, useCreateProjectMutation } from '@/modules/projects';
 * import type { ProjectFormInput } from '@/modules/projects';
 * ```
 */
export { projectsApi } from './api';
export { projectApiTokensApi, type ApiToken, type CreateApiTokenResult } from './api-tokens';
export { projectKeys } from './keys';
export {
  useProjectsQuery,
  useProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from './queries';
export {
  useApiTokensQuery,
  useCreateApiTokenMutation,
  useRevokeApiTokenMutation,
} from './api-token-queries';
export type { ProjectFormInput } from './types';

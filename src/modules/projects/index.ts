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
export { projectKeys } from './keys';
export {
  useProjectsQuery,
  useProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from './queries';
export type { ProjectFormInput } from './types';

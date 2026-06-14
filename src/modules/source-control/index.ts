/**
 * Source control module — SCM provider connections and repository management.
 *
 * @module source-control
 *
 * @example
 * ```ts
 * import { sourceControlApi, useSourceControlProvidersQuery } from '@/modules/source-control';
 * import type { ScmProviderConnection, RepositoryCatalog } from '@/modules/source-control';
 * ```
 */
export { sourceControlApi } from './api';
export { sourceControlKeys } from './keys';
export {
  useSourceControlProvidersQuery,
  useSourceControlReposQuery,
  useAddSourceControlProviderMutation,
  useSyncProviderMutation,
  useUpdateSourceControlMutation,
  useTestSourceControlMutation,
  useImportRepositoryMutation,
  useUninstallRepositoryMutation,
  useSendSourceControlTestEventMutation,
  useDeleteSourceControlMutation,
} from './queries';
export type {
  ScmProviderConnection,
  RepositoryCatalog,
  AddProviderPayload,
  SyncReposPayload,
} from './types';

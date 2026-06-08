'use client';

import { useSessionQuery } from '@/modules/auth/queries';

/**
 * Hook to get the current workspace ID from the session.
 * Returns the workspaceId from the authenticated user's current workspace.
 *
 * @example
 * ```tsx
 * const { workspaceId } = useWorkspace();
 * const { data } = useQuery({
 *   queryFn: () => projectsApi.list(workspaceId, params),
 *   enabled: !!workspaceId,
 * });
 * ```
 */
export function useWorkspace() {
  const session = useSessionQuery();
  const workspaceId = session.data?.workspace?.id ?? session.data?.user?.currentWorkspaceId ?? null;

  return {
    workspaceId,
    isLoading: session.isLoading,
    isError: session.isError,
  };
}

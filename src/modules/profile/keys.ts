/**
 * TanStack Query key factory for the profile module.
 *
 * @example
 * ```ts
 * queryClient.invalidateQueries({ queryKey: profileKeys.detail('usr_01') });
 * ```
 */
export const profileKeys = {
  /** Root key — invalidates all profile queries. */
  all: ['profile'] as const,
  /** Key for a single user profile. */
  detail: (userId: string) => [...profileKeys.all, 'detail', userId] as const,
};

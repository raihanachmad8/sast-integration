/**
 * TanStack Query key factory for the auth module.
 *
 * @example
 * ```ts
 * // Invalidate session to force re-fetch
 * queryClient.invalidateQueries({ queryKey: authKeys.session() });
 * ```
 */
export const authKeys = {
  /** Root key — invalidates all auth queries. */
  all: ['auth'] as const,
  /** Key for the current user session. */
  session: () => [...authKeys.all, 'session'] as const,
  /** Key for application configuration. */
  config: () => [...authKeys.all, 'config'] as const,
  /** Key for email verification. */
  verifyEmail: (token: string) => [...authKeys.all, 'verifyEmail', token] as const,
};

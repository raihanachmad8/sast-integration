'use client';

import { useSessionQuery } from './queries';

/**
 * Hook to get the current user's email verification status.
 *
 * This is the recommended way to access `emailVerified` flag across the application.
 *
 * @example
 * const { isVerified, isLoading } = useEmailVerificationStatus();
 *
 * if (!isVerified) {
 *   // show banner or restrict features
 * }
 */
export function useEmailVerificationStatus() {
  const session = useSessionQuery();

  const user = session.data?.user;
  const isVerified = user ? user.emailVerified : false;

  return {
    /** Whether the user's email has been verified */
    isVerified,
    /** Whether the session is still loading */
    isLoading: session.isLoading || session.isFetching,
    /** The full user object (if available) */
    user,
    /** Raw session query for advanced usage */
    session,
  };
}

'use client';

import { useSessionQuery } from '@/modules/auth/queries';

/**
 * Get authorization headers for API calls using the current session.
 * Returns an empty object if no token is available.
 *
 * @example
 * const headers = useAuthHeaders();
 * const res = await fetch('/api/data', { headers });
 */
export function useAuthHeaders(): Record<string, string> {
  const session = useSessionQuery();
  const token = session.data?.accessToken;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

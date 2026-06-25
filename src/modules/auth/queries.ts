'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';
import { authKeys } from './keys';
import { setAccessToken, setWorkspaceId, refreshAccessToken, clearWorkspaceCache } from '@/lib/api/client';
import { STALE } from '@/commons/constants/query';
import type { SessionData, SigninResponse, RefreshTokenResponse } from './types';
import type { ApiResponse } from '@/commons/types/api';

/**
 * Query hook for the current user session.
 * Uses fast path (in-memory access token) first, then falls back to refresh.
 * Stale time: 5 minutes.
 */
export function useSessionQuery() {
  const query = useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<SessionData & { accessToken: string }> => {
      const existingToken = typeof window !== 'undefined' ? window.__accessToken : undefined;

      if (existingToken) {
        const res: ApiResponse<SessionData> = await authApi.me();
        return { ...res.data, accessToken: existingToken };
      }

      const refreshData = await refreshAccessToken() as { data: RefreshTokenResponse };
      const accessToken = refreshData.data.accessToken;
      setAccessToken(accessToken);
      const res: ApiResponse<SessionData> = await authApi.me();
      return { ...res.data, accessToken };
    },
    retry: false,
    staleTime: STALE.DEFAULT,
  });

  // Sync workspace ID after render (not during) — avoids side effects in render phase
  useEffect(() => {
    if (query.data?.workspace?.id) {
      setWorkspaceId(query.data.workspace.id, query.data.workspace.slug);
    }
  }, [query.data?.workspace?.id, query.data?.workspace?.slug]);

  return query;
}

/**
 * Query hook for application configuration (workspace mode, etc.).
 * Stale time: Infinity (config rarely changes).
 *
 * @example
 * ```tsx
 * const { data: config, isLoading } = useConfigQuery();
 * console.log(config?.workspaceMode); // 'multi'
 * ```
 */
export function useConfigQuery() {
  return useQuery({
    queryKey: authKeys.config(),
    queryFn: async () => {
      const { data } = await authApi.config();
      return data;
    },
    staleTime: Infinity,
  });
}

/**
 * Mutation hook for signing in with email and password.
 * Sets the access token and updates the session cache on success.
 *
 * @example
 * ```tsx
 * const signinMutation = useSigninMutation();
 * signinMutation.mutate({ email: 'alice@sast.dev', password: 'secret' });
 * ```
 */
export function useSigninMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.signin(email, password).then((res) => res.data),
    onSuccess: (data: SigninResponse) => {
      setAccessToken(data.accessToken);
      setWorkspaceId(data.workspace?.id ?? '', data.workspace?.slug);
      queryClient.setQueryData(authKeys.session(), {
        user: data.user,
        workspace: data.workspace,
        accessToken: data.accessToken,
      });
    },
  });
}

/**
 * Mutation hook for registering a new user account.
 * Returns neutral response on duplicate emails (prevents enumeration).
 *
 * @example
 * ```tsx
 * const signupMutation = useSignupMutation();
 * signupMutation.mutate({ email: 'bob@sast.dev', password: 'securepass', name: 'Bob Chen' });
 * ```
 */
export function useSignupMutation() {
  return useMutation({
    mutationFn: ({ email, password, name, confirmPassword }: { email: string; password: string; name: string; confirmPassword: string }) =>
      authApi.signup(email, password, name, confirmPassword).then((res) => res.data),
  });
}

/**
 * Query hook for verifying an email token.
 * Retries twice on failure, disabled when token is empty.
 *
 * @param token - The verification token from the URL.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useVerifyEmailQuery(token);
 * ```
 */
export function useVerifyEmailQuery(token: string) {
  return useQuery({
    queryKey: authKeys.verifyEmail(token),
    queryFn: async () => {
      const { data } = await authApi.verifyEmail(token);
      return data;
    },
    enabled: !!token,
    retry: 2,
  });
}

/**
 * Mutation hook for signing out.
 * Always clears client state even if the server call fails.
 *
 * @example
 * ```tsx
 * const signoutMutation = useSignoutMutation();
 * signoutMutation.mutate();
 * // Redirects to /auth/signin
 * ```
 */
export function useSignoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.signout();
      } catch {
        // Signout should always clear client state even if server call fails
      }
      setAccessToken('');
      clearWorkspaceCache();
    },
    onSettled: () => {
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.clear();
    },
  });
}

export { useEmailVerificationStatus } from './useEmailVerification';

/**
 * Helper to extract properly typed session data from useSessionQuery.
 * Works around Turbopack type inference issues with useQuery generics.
 */
export function useSessionData() {
  const query = useSessionQuery();
  const data = query.data as (SessionData & { accessToken: string }) | undefined;
  return { ...query, data };
}

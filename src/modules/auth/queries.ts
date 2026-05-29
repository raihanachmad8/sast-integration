'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, type SessionData, type SigninResponse } from './api';
import { authKeys } from './keys';

export function useSessionQuery() {
  return useQuery({
    queryKey: authKeys.session(),
    queryFn: async (): Promise<SessionData & { accessToken: string }> => {
      const { accessToken } = await authApi.refresh();
      const session = await authApi.me(accessToken);
      return { ...session, accessToken };
    },
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useConfigQuery() {
  return useQuery({
    queryKey: authKeys.config(),
    queryFn: () => authApi.config(),
    staleTime: Infinity,
  });
}

export function useSigninMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.signin(email, password),
    onSuccess: (data: SigninResponse) => {
      queryClient.setQueryData(authKeys.session(), {
        user: data.user,
        workspace: null,
        accessToken: data.accessToken,
      });
    },
  });
}

export function useSignupMutation() {
  return useMutation({
    mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
      authApi.signup(email, password, name),
  });
}

export function useSignoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => authApi.signout(token),
    onSettled: () => {
      queryClient.setQueryData(authKeys.session(), null);
      queryClient.invalidateQueries({ queryKey: authKeys.session() });
    },
  });
}

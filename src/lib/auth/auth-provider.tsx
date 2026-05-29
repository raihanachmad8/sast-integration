'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  currentWorkspaceId: string | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthActions {
  signin: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  signout: () => Promise<void>;
  refresh: () => Promise<void>;
  loadSession: () => Promise<void>;
}

type AuthContextType = AuthState & AuthActions;

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api/v1';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message ?? `Error ${res.status}`);
  return json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    accessToken: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const signin = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ data: { accessToken: string; user: User } }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setState((s) => ({
      ...s,
      user: res.data.user,
      accessToken: res.data.accessToken,
      isAuthenticated: true,
      isLoading: false,
    }));
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }, []);

  const signout = useCallback(async () => {
    await apiFetch('/auth/signout', {
      method: 'POST',
      headers: state.accessToken ? { Authorization: `Bearer ${state.accessToken}` } : {},
    });
    setState({ user: null, workspace: null, accessToken: null, isLoading: false, isAuthenticated: false });
  }, [state.accessToken]);

  const refresh = useCallback(async () => {
    try {
      const res = await apiFetch<{ data: { accessToken: string } }>('/auth/refresh', { method: 'POST' });
      setState((s) => ({ ...s, accessToken: res.data.accessToken }));
    } catch {
      setState((s) => ({ ...s, user: null, workspace: null, accessToken: null, isAuthenticated: false }));
    }
  }, []);

  const loadSession = useCallback(async () => {
    try {
      // Try refresh first to get a valid access token
      const refreshRes = await apiFetch<{ data: { accessToken: string } }>('/auth/refresh', { method: 'POST' });
      const token = refreshRes.data.accessToken;

      const meRes = await apiFetch<{ data: { user: User; workspace: Workspace | null } }>('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setState({
        user: meRes.data.user,
        workspace: meRes.data.workspace,
        accessToken: token,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch {
      setState({ user: null, workspace: null, accessToken: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const refreshRes = await apiFetch<{ data: { accessToken: string } }>('/auth/refresh', { method: 'POST' });
        const token = refreshRes.data.accessToken;
        const meRes = await apiFetch<{ data: { user: User; workspace: Workspace | null } }>('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setState({ user: meRes.data.user, workspace: meRes.data.workspace, accessToken: token, isLoading: false, isAuthenticated: true });
        }
      } catch {
        if (!cancelled) {
          setState({ user: null, workspace: null, accessToken: null, isLoading: false, isAuthenticated: false });
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signin, signup, signout, refresh, loadSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

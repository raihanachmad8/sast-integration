import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { SECURITY } from '@/commons/constants';
import { clientEnv } from '@/config/client-env';

/**
 * Axios-based API client factory — single source of truth for all HTTP requests.
 *
 * Features:
 * - Auto-injects Authorization header from cookies
 * - Auto-refreshes expired access tokens (401 → refresh → retry)
 * - Queues concurrent requests during refresh
 * - Standardized error handling
 *
 * @example
 * ```ts
 * import { Api } from '@/lib/api/client';
 * import { clientEnv } from '@/config/client-env';
 *
 * const api = Api({ baseUrl: clientEnv.apiUrl });
 *
 * // GET
 * const { data } = await api.Get<WorkspaceItem[]>('/api/v1/workspaces');
 *
 * // POST
 * const { data } = await api.Post<SigninResponse>('/api/v1/auth/signin', { email, password });
 * ```
 */

// ─── Types ───────────────────────────────────────────────────

export type TApi = {
  /** Base URL for all API requests (e.g. http://localhost:3000/api/v1). */
  baseUrl: string;
};

export interface IApiClient {
  /** Typed GET request. Returns the response body as T. */
  Get<T>(path: string, params?: Record<string, unknown>): Promise<T>;
  /** Typed POST request with optional extra axios config (e.g., custom headers). */
  Post<T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>): Promise<T>;
  /** Typed PUT request with optional extra axios config. */
  Put<T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>): Promise<T>;
  /** Typed PATCH request with optional extra axios config. */
  Patch<T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>): Promise<T>;
  /** Typed DELETE request. */
  Delete<T>(path: string): Promise<T>;
}

// ─── URL Normalization ─────────────────────────────────────

/**
 * Strip trailing /api/v1 to isolate the origin.
 *
 * This allows callers to pass `clientEnv.apiUrl` (e.g. 'http://localhost:3000/api/v1')
 * while ENDPOINTS paths retain their /api/v1/... prefix.
 *
 * @example
 * normalizeBaseUrl('http://localhost:3000/api/v1') → 'http://localhost:3000'
 * normalizeBaseUrl('/api/v1') → ''
 * normalizeBaseUrl('http://localhost:3000') → 'http://localhost:3000'
 */
function normalizeBaseUrl(url: string): string {
  return url.replace(/\/api\/v1\/?$/, '');
}

// ─── Token Storage ───────────────────────────────────────────

const isBrowser = typeof window !== 'undefined';

export function setAccessToken(token: string) {
  if (isBrowser) window.__accessToken = token;
}

export function getAccessToken(): string | undefined {
  return isBrowser ? window.__accessToken : undefined;
}

// ─── Workspace ID Storage ──────────────────────────────────

let currentWorkspaceId: string | null = null;

const WORKSPACE_CACHE_KEY = 'sast_active_workspace';

export interface CachedWorkspace {
  id: string;
  slug: string;
}

// Stable snapshot cache for useSyncExternalStore
// Uses a sentinel to distinguish "not yet read" from "empty"
const NOT_READ = Symbol('NOT_READ');
let _cachedSnapshot: CachedWorkspace | null | typeof NOT_READ = NOT_READ;
let _cachedRaw: string | null | typeof NOT_READ = NOT_READ;

function readCachedWorkspace(): CachedWorkspace | null {
  if (!isBrowser) return null;
  try {
    const raw = localStorage.getItem(WORKSPACE_CACHE_KEY);
    if (raw === _cachedRaw && _cachedSnapshot !== NOT_READ) return _cachedSnapshot;
    _cachedRaw = raw;
    _cachedSnapshot = raw ? (JSON.parse(raw) as CachedWorkspace) : null;
    return _cachedSnapshot;
  } catch {
    _cachedRaw = null;
    _cachedSnapshot = null;
    return null;
  }
}

/** Get cached workspace from localStorage (stable reference for useSyncExternalStore). */
export function getCachedWorkspace(): CachedWorkspace | null {
  return readCachedWorkspace();
}

function writeCachedWorkspace(id: string, slug: string) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify({ id, slug }));
    _cachedRaw = NOT_READ; // invalidate
    _cachedSnapshot = NOT_READ;
  } catch { /* storage full — non-critical */ }
}

function clearCachedWorkspace() {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(WORKSPACE_CACHE_KEY);
    _cachedRaw = NOT_READ; // invalidate
    _cachedSnapshot = NOT_READ;
  } catch { /* non-critical */ }
}

/** Set the current workspace ID for API requests and cache to localStorage. */
export function setWorkspaceId(id: string, slug?: string) {
  currentWorkspaceId = id;
  if (slug) {
    writeCachedWorkspace(id, slug);
  }
}

/** Get the current workspace ID. */
export function getWorkspaceId(): string | null {
  return currentWorkspaceId;
}

/**
 * Get the cached workspace slug from localStorage.
 * Returns the last-used workspace slug instantly, without any API call.
 * Used by AuthenticatedShell for optimistic rendering on page load.
 */
export function getCachedWorkspaceSlug(): string | null {
  return readCachedWorkspace()?.slug ?? null;
}

/**
 * Clear workspace cache on signout.
 */
export { clearCachedWorkspace as clearWorkspaceCache };

declare global {
  interface Window {
    __accessToken?: string;
  }
}

// ─── Refresh Token Queue ──────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  for (const { resolve, reject } of failedQueue) {
    if (error || !token) {
      reject(error);
    } else {
      resolve(token);
    }
  }
  failedQueue = [];
}

// ─── Private request helper ───────────────────────────────

async function request<T>(
  instance: AxiosInstance,
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, unknown>,
  config?: Partial<AxiosRequestConfig>,
): Promise<T> {
  const { data } = await instance.request<T>({
    method,
    url: path,
    data: body,
    params,
    ...config,
  });
  return data;
}

// ─── Factory ──────────────────────────────────────────────

/**
 * Create a new API client instance with interceptors for auth and auto-refresh.
 *
 * @param baseUrl - Base URL including /api/v1 prefix (e.g. clientEnv.apiUrl).
 * The /api/v1 suffix is stripped internally so ENDPOINTS paths continue to work.
 *
 * @example
 * ```ts
 * const api = Api({ baseUrl: clientEnv.apiUrl });
 * const data = await api.Get<ApiResponse<Project[]>>(ENDPOINTS.PROJECTS.LIST(workspaceId));
 * ```
 */
export function Api({ baseUrl }: TApi): IApiClient {
  const normalized = normalizeBaseUrl(baseUrl);

  const instance = axios.create({
    baseURL: normalized,
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
  });

  // ── Request Interceptor ──────────────────────────────
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const workspaceId = getWorkspaceId();
      if (workspaceId) {
        config.headers['x-workspace-id'] = workspaceId;
      }
      // Let axios auto-set Content-Type with correct boundary for FormData
      if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
      }
      return config;
    },
    (error) => Promise.reject(error),
  );

  // ── Response Interceptor (Auto Refresh) ──────────────
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status !== 401 || originalRequest._retry) {
        return Promise.reject(error);
      }

      if (originalRequest.url?.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return instance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Use the RAW baseUrl (before normalization) for the refresh call
        const { data } = await axios.post(
          `${baseUrl}/auth/refresh`,
          {},
          {
            headers: {
              [SECURITY.REFRESH_CSRF_HEADER]: SECURITY.REFRESH_CSRF_HEADER_VALUE,
            },
            withCredentials: true,
          },
        );

        const newAccessToken = data.data.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return instance(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken('');

        if (typeof window !== 'undefined') {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/auth/signin?redirect=${redirect}`;
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return {
    Get: <T>(path: string, params?: Record<string, unknown>) =>
      request<T>(instance, 'GET', path, undefined, params),

    Post: <T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>) =>
      request<T>(instance, 'POST', path, body, undefined, config),

    Put: <T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>) =>
      request<T>(instance, 'PUT', path, body, undefined, config),

    Patch: <T>(path: string, body?: unknown, config?: Partial<AxiosRequestConfig>) =>
      request<T>(instance, 'PATCH', path, body, undefined, config),

    Delete: <T>(path: string) =>
      request<T>(instance, 'DELETE', path),
  };
}

// ─── Standalone Refresh (bypasses interceptor) ──────────

/**
 * Call the refresh endpoint directly via raw axios (bypasses interceptor).
 * Used by useSessionQuery for the initial page-load refresh where no
 * access token exists in memory yet. This avoids the double-refresh race
 * condition that occurs when authApi.refresh() goes through the interceptor.
 *
 * @returns Refresh response with new access token
 */
export async function refreshAccessToken() {
  const { data } = await axios.post(
    `${clientEnv.apiUrl}/auth/refresh`,
    {},
    {
      headers: {
        [SECURITY.REFRESH_CSRF_HEADER]: SECURITY.REFRESH_CSRF_HEADER_VALUE,
      },
      withCredentials: true,
    },
  );
  return data;
}


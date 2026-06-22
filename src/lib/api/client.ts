import axios, { type AxiosError, type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { SECURITY } from '@/commons/constants';

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

/** Set the current workspace ID for API requests. */
export function setWorkspaceId(id: string) {
  currentWorkspaceId = id;
}

/** Get the current workspace ID. */
export function getWorkspaceId(): string | null {
  return currentWorkspaceId;
}

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


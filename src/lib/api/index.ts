/**
 * API Client — factory pattern for typed HTTP requests.
 *
 * @example
 * ```ts
 * import { Api } from '@/lib/api/client';
 * import { clientEnv } from '@/config/client-env';
 *
 * const api = Api({ baseUrl: clientEnv.apiUrl });
 * const data = await api.Get<ApiResponse<Project[]>>('/api/v1/projects');
 * ```
 */
export type { IApiClient, TApi } from './client';
export { Api, setAccessToken, getAccessToken } from './client';

import { Api } from '@/lib/api/client';
import type { ApiResponse } from '@/commons/types/api';
import { ENDPOINTS, SECURITY } from '@/commons/constants';
import { clientEnv } from '@/config/client-env';
import type { SessionData, SigninResponse, RefreshTokenResponse } from './types';

const _api = Api({ baseUrl: clientEnv.apiUrl });

/**
 * Authentication API client — signin, signup, signout, refresh, session.
 *
 * All methods use the centralized axios client with auto-refresh interceptor.
 * The refresh endpoint requires the `x-refresh-request: 1` CSRF header.
 *
 * @example
 * ```ts
 * import { authApi } from '@/modules/auth/api';
 *
 * // Sign in
 * const { data } = await authApi.signin('alice@sast.dev', 'password123');
 * console.log(data.accessToken); // JWT access token
 *
 * // Get current session
 * const session = await authApi.me();
 * console.log(session.data.user.name); // 'Alice Tan'
 *
 * // Sign out (clears refresh token cookie)
 * await authApi.signout();
 * ```
 */
export const authApi = {
  /**
   * Sign in with email and password.
   * Returns access token + user/workspace data.
   *
   * @param email - User email address.
   * @param password - User password.
   * @returns SigninResponse with token, user, and workspace info.
   *
   * @example
   * ```ts
   * const { data } = await authApi.signin('alice@sast.dev', 'password123');
   * setAccessToken(data.accessToken);
   * ```
   */
  signin: (email: string, password: string) =>
    _api.Post<ApiResponse<SigninResponse>>(ENDPOINTS.AUTH.SIGNIN, { email, password }),

  /**
   * Register a new user account.
   * Returns neutral response on duplicate emails (prevents enumeration).
   *
   * @param email - User email address.
   * @param password - User password.
   * @param name - User display name.
   * @returns Created user ID and email.
   *
   * @example
   * ```ts
   * const { data } = await authApi.signup('bob@sast.dev', 'securepass', 'Bob Chen');
   * console.log(data.id); // user UUID
   * ```
   */
  signup: (email: string, password: string, name: string) =>
    _api.Post<ApiResponse<{ id: string; email: string }>>(ENDPOINTS.AUTH.SIGNUP, { email, password, name }),

  /**
   * Sign out — invalidates the current session and clears the refresh token cookie.
   *
   * @example
   * ```ts
   * await authApi.signout();
   * // Client-side: clear access token and redirect to /auth/signin
   * ```
   */
  signout: () =>
    _api.Post<ApiResponse<null>>(ENDPOINTS.AUTH.SIGNOUT),

  /**
   * Refresh the access token using the httpOnly refresh token cookie.
   * Requires the CSRF header `x-refresh-request: 1`.
   *
   * @returns New access token metadata.
   *
   * @example
   * ```ts
   * const { data } = await authApi.refresh();
   * setAccessToken(data.accessToken);
   * ```
   */
  refresh: async () => {
    return _api.Post<ApiResponse<RefreshTokenResponse>>(
      ENDPOINTS.AUTH.REFRESH,
      {},
      { headers: { [SECURITY.REFRESH_CSRF_HEADER]: SECURITY.REFRESH_CSRF_HEADER_VALUE } },
    );
  },

  /**
   * Fetch the current authenticated user's session data.
   * Requires a valid access token.
   *
   * @returns SessionData with user and workspace info.
   *
   * @example
   * ```ts
   * const { data } = await authApi.me();
   * console.log(data.user.email); // 'alice@sast.dev'
   * console.log(data.workspace?.name); // 'SAST Integration'
   * ```
   */
  me: async () => {
    return _api.Get<ApiResponse<SessionData>>(ENDPOINTS.AUTH.ME);
  },

  /**
   * Verify an email address using the token from the verification link.
   *
   * @param token - The verification token.
   * @returns Success confirmation.
   *
   * @example
   * ```ts
   * const { data } = await authApi.verifyEmail('abc123');
   * // Email verified
   * ```
   */
  verifyEmail: (token: string) =>
    _api.Get<ApiResponse<null>>(`${ENDPOINTS.AUTH.VERIFY_EMAIL}?token=${encodeURIComponent(token)}`),

  /**
   * Resend the email verification link for the current user.
   *
   * @example
   * ```ts
   * await authApi.resendVerification();
   * // "Verification email sent"
   * ```
   */
  resendVerification: () =>
    _api.Post<ApiResponse<null>>(ENDPOINTS.AUTH.RESEND_VERIFICATION),

  /**
   * Fetch application configuration (workspace mode, etc.).
   *
   * @returns ConfigData with workspace mode info.
   *
   * @example
   * ```ts
   * const { data } = await authApi.config();
   * console.log(data.workspaceMode); // 'multi'
   * ```
   */
  config: () =>
    _api.Get<ApiResponse<{ workspaceMode: string }>>('/config'),
};

/**
 * Authenticated user profile.
 *
 * @example
 * ```ts
 * const user: User = {
 *   id: 'usr_01',
 *   email: 'alice@sast.dev',
 *   name: 'Alice Tan',
 *   emailVerified: true,
 *   currentWorkspaceId: 'ws_01',
 * };
 * ```
 */
export interface User {
  /** Unique user ID. */
  id: string;
  /** User email address. */
  email: string;
  /** User display name. */
  name: string;
  /** Whether the user's email has been verified. */
  emailVerified: boolean;
  /** Currently active workspace ID. */
  currentWorkspaceId: string | null;
}

/**
 * Workspace summary returned in session data.
 *
 * @example
 * ```ts
 * const workspace: Workspace = {
 *   id: 'ws_01',
 *   name: 'SAST Integration',
 *   slug: 'sast-integration',
 *   role: 'owner',
 * };
 * ```
 */
export interface Workspace {
  /** Workspace ID. */
  id: string;
  /** Workspace display name. */
  name: string;
  /** URL-friendly workspace slug. */
  slug: string;
  /** User's role in this workspace. */
  role: string;
  /** Resolved permissions for the user in this workspace (role permissions + user overrides). */
  permissions: string[];
}

/**
 * Session data returned by `/auth/me`.
 *
 * @example
 * ```ts
 * const session: SessionData = {
 *   user: { id: 'usr_01', email: 'alice@sast.dev', ... },
 *   workspace: { id: 'ws_01', name: 'SAST Integration', ... },
 * };
 * ```
 */
export interface SessionData {
  /** Current session ID (from JWT). */
  sessionId: string;
  /** Authenticated user. */
  user: User;
  /** Current workspace (null if user has no workspace). */
  workspace: Workspace | null;
}

/**
 * Signin response — includes access token and user/workspace data.
 *
 * @example
 * ```ts
 * const res: SigninResponse = {
 *   tokenType: 'Bearer',
 *   accessToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   expiresAt: '2026-06-04T12:00:00Z',
 *   expiresIn: 900,
 *   user: { id: 'usr_01', ... },
 *   workspace: { id: 'ws_01', ... },
 * };
 * ```
 */
export interface SigninResponse {
  /** Token type (always 'Bearer'). */
  tokenType: string;
  /** JWT access token. */
  accessToken: string;
  /** ISO 8601 expiration timestamp. */
  expiresAt: string;
  /** Token lifetime in seconds. */
  expiresIn: number;
  /** Authenticated user. */
  user: User;
  /** Current workspace. */
  workspace: Workspace | null;
}

/**
 * Refresh token response — returned by POST /auth/refresh.
 *
 * @example
 * ```ts
 * const res: RefreshTokenResponse = {
 *   tokenType: 'Bearer',
 *   accessToken: 'eyJhbGciOiJIUzI1NiIs...',
 *   expiresAt: '2026-06-04T12:00:00Z',
 *   expiresIn: 900,
 * };
 * ```
 */
export interface RefreshTokenResponse {
  /** Token type (always 'Bearer'). */
  tokenType: string;
  /** JWT access token. */
  accessToken: string;
  /** ISO 8601 expiration timestamp. */
  expiresAt: string;
  /** Token lifetime in seconds. */
  expiresIn: number;
}

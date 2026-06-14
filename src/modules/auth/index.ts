/**
 * Auth module — authentication, session management, and user types.
 *
 * @module auth
 *
 * @example
 * ```ts
 * import { authApi, useSessionQuery, useSigninMutation } from '@/modules/auth';
 * import type { User, SessionData, SigninResponse } from '@/modules/auth';
 * ```
 */
export { authApi } from './api';
export { authKeys } from './keys';
export {
  useSessionQuery,
  useSessionData,
  useConfigQuery,
  useSigninMutation,
  useSignupMutation,
  useSignoutMutation,
  useEmailVerificationStatus,
} from './queries';
export type { User, Workspace, SessionData, SigninResponse } from './types';

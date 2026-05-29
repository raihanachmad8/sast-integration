/**
 * Auth module public API.
 * Uses tanstack query for data management — no useEffect, automatic cache invalidation.
 */
export { useSessionQuery, useConfigQuery, useSigninMutation, useSignupMutation, useSignoutMutation } from '@/modules/auth/queries';
export { authApi } from '@/modules/auth/api';
export type { User, Workspace, SessionData } from '@/modules/auth/api';

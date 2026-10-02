/**
 * Centralized API endpoint definitions.
 *
 * All API paths are defined here for maintainability.
 * Usage: import { ENDPOINTS } from '@/commons/constants/endpoints';
 *
 * @example
 * ```ts
 * import { ENDPOINTS } from '@/commons/constants/endpoints';
 *
 * const res = await fetch(ENDPOINTS.FINDINGS.LIST);
 * const res = await fetch(ENDPOINTS.FINDINGS.DETAIL(id));
 * ```
 */

export const ENDPOINTS = {
  // ── Auth ──────────────────────────────────────────────
  AUTH: {
    SIGNIN: '/api/v1/auth/signin',
    SIGNOUT: '/api/v1/auth/signout',
    SIGNUP: '/api/v1/auth/signup',
    ME: '/api/v1/auth/me',
    REFRESH: '/api/v1/auth/refresh',
    FORGOT_PASSWORD: '/api/v1/auth/forgot-password',
    RESET_PASSWORD: '/api/v1/auth/reset-password',
    VERIFY_EMAIL: '/api/v1/auth/verify-email',
    RESEND_VERIFICATION: '/api/v1/auth/resend-verification',
    PROFILE: '/api/v1/auth/me',
    PROFILE_UPDATE: '/api/v1/users/profile',
    SESSIONS: '/api/v1/auth/sessions',
    REVOKE_SESSION: (sessionId: string) => `/api/v1/auth/sessions/${sessionId}`,
    AUDIT_LOG: '/api/v1/auth/audit-log',
    CHANGE_PASSWORD: '/api/v1/auth/change-password',
  },

  // ── Workspaces ────────────────────────────────────────
  WORKSPACES: {
    LIST: '/api/v1/workspaces',
    DETAIL: (id: string) => `/api/v1/workspaces/${id}`,
    MEMBERS: (id: string) => `/api/v1/workspaces/${id}/members`,
    MEMBER: (id: string, userId: string) => `/api/v1/workspaces/${id}/members/${userId}`,
    INVITATIONS: (id: string) => `/api/v1/workspaces/${id}/invitations`,
    INVITATION: (id: string, invitationId: string) => `/api/v1/workspaces/${id}/invitations/${invitationId}`,
  },

  // ── Projects ──────────────────────────────────────────
  PROJECTS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/projects`,
    DETAIL: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    API_TOKENS: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/api-tokens`,
    API_TOKEN: (workspaceId: string, projectId: string, tokenId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/api-tokens/${tokenId}`,
  },

  // ── Findings ──────────────────────────────────────────
  FINDINGS: {
    LIST: '/api/v1/findings',
    DETAIL: (id: string) => `/api/v1/findings/${id}`,
    STATUS: (id: string) => `/api/v1/findings/${id}/status`,
    ASSIGN: (id: string) => `/api/v1/findings/${id}/assign`,
    VERIFY: (id: string) => `/api/v1/findings/${id}/verify`,
    BULK: '/api/v1/findings/bulk',
    AI_VERIFY: '/api/v1/findings/ai-verify',
    MEMBERS: '/api/v1/members',
  },

  // ── Scans ─────────────────────────────────────────────
  SCANS: {
    LIST: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans`,
    LIST_ALL: '/api/v1/scans',
    DETAIL: (id: string) => `/api/v1/scans/${id}`,
    FINDINGS: (scanId: string) => `/api/v1/scans/${scanId}/findings`,
    UPLOAD: (workspaceId: string, projectId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/scans/upload`,
    REPARSE: (workspaceId: string, projectId: string, scanId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/scans/${scanId}/reparse`,
    RUN: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans/run`,
  },

  // ── Scan Profiles ────────────────────────────────────
  SCAN_PROFILES: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/scan-profiles`,
    LIST_ALL: '/api/v1/scan-profiles',
    DETAIL: (workspaceId: string, profileId: string) => `/api/v1/workspaces/${workspaceId}/scan-profiles/${profileId}`,
    DETAIL_ALL: (profileId: string) => `/api/v1/scan-profiles/${profileId}`,
  },

  // ── Repositories ──────────────────────────────────────
  REPOSITORIES: {
    LIST: (workspaceId: string, projectId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`,
    IMPORT: (workspaceId: string, projectId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories`,
    LIST_WORKSPACE: (workspaceId: string) =>
      `/api/v1/workspaces/${workspaceId}/repositories`,
    DETAIL: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}`,
    DETAIL_SIMPLE: (repoId: string) =>
      `/api/v1/repositories/${repoId}`,
    SCHEDULE: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/schedule`,
  },

  // ── AI Models ─────────────────────────────────────────
  AI_MODELS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/model`,
    LIST_ALL: '/api/v1/model',
    DETAIL: (workspaceId: string, modelId: string) => `/api/v1/workspaces/${workspaceId}/model/${modelId}`,
    DETAIL_ALL: (modelId: string) => `/api/v1/model/${modelId}`,
  },

  // ── Knowledge Base ────────────────────────────────────
  KNOWLEDGE_BASE: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-base`,
    LIST_ALL: '/api/v1/knowledge-base',
    DETAIL: (workspaceId: string, entryId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-base/${entryId}`,
    DETAIL_ALL: (entryId: string) => `/api/v1/knowledge-base/${entryId}`,
  },

  // ── Knowledge Sources ─────────────────────────────────
  KNOWLEDGE_SOURCES: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources`,
    DETAIL: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}`,
    SYNC: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}/sync`,
    BACKFILL: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}/backfill`,
  },

  // ── Webhooks ──────────────────────────────────────────
  WEBHOOKS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/webhooks`,
    LIST_ALL: '/api/v1/webhooks',
    DETAIL: (workspaceId: string, webhookId: string) => `/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`,
    DETAIL_ALL: (webhookId: string) => `/api/v1/webhooks/${webhookId}`,
    TEST: (webhookId: string) => `/api/v1/webhooks/${webhookId}/test`,
  },

  // ── Schedules ─────────────────────────────────────────
  SCHEDULES: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/schedules`,
    LIST_ALL: '/api/v1/schedules',
    DETAIL: (workspaceId: string, scheduleId: string) => `/api/v1/workspaces/${workspaceId}/schedules/${scheduleId}`,
    DETAIL_ALL: (scheduleId: string) => `/api/v1/schedules/${scheduleId}`,
    TOGGLE: (scheduleId: string) => `/api/v1/schedules/${scheduleId}/toggle`,
  },

  // ── Source Controls ───────────────────────────────────
  SOURCE_CONTROLS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/source-controls`,
    DETAIL: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}`,
    TEST: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}/test`,
    SYNC: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}/sync`,
    TEST_EVENT: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/source-controls/test-event`,
    REPOS: '/api/v1/source-control/repos',
  },

  // ── Teams ─────────────────────────────────────────────
  TEAMS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/teams`,
    DETAIL: (workspaceId: string, teamId: string) => `/api/v1/workspaces/${workspaceId}/teams/${teamId}`,
    MEMBERS: (workspaceId: string, teamId: string) => `/api/v1/workspaces/${workspaceId}/teams/${teamId}/members`,
  },

  // ── Quality Gates ─────────────────────────────────────
  QUALITY_GATES: {
    CONFIG: '/api/v1/quality-gates',
    EVALUATE: '/api/v1/quality-gates/evaluate',
    RESULTS: '/api/v1/quality-gates/results',
  },

  // ── Scanner Engines ───────────────────────────────────
  SCANNER_ENGINES: {
    LIST: '/api/v1/scanner-engines',
    RULES: (scannerId: string) => `/api/v1/scanner-engines/${scannerId}/rules`,
  },

  // ── Reports ───────────────────────────────────────────
  REPORTS: {
    LIST: '/api/v1/reports',
    DETAIL: (reportId: string) => `/api/v1/reports/${reportId}`,
  },

  // ── Dashboard ─────────────────────────────────────────
  DASHBOARD: {
    STATS: '/api/v1/dashboard/stats',
    SCANS: '/api/v1/dashboard/scans',
    FINDINGS: '/api/v1/dashboard/findings',
    HEALTH: '/api/v1/dashboard/health',
  },

  // ── Users ─────────────────────────────────────────────
  USERS: {
    ME: '/api/v1/users/me',
  },
} as const;

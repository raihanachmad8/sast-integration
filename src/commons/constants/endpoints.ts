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
    CHANGE_PASSWORD: '/api/v1/users/me/password',
    INVITE_ACCEPT_LOGGED_IN: '/api/v1/auth/invite/accept-logged-in',
  },

  // ── Workspaces ────────────────────────────────────────
  WORKSPACES: {
    LIST: '/api/v1/workspaces',
    DETAIL: (id: string) => `/api/v1/workspaces/${id}`,
    MEMBERS: (id: string) => `/api/v1/workspaces/${id}/members`,
    MEMBER: (id: string, userId: string) => `/api/v1/workspaces/${id}/members/${userId}`,
    INVITATIONS: (id: string) => `/api/v1/workspaces/${id}/invitations`,
    INVITATION: (id: string, invitationId: string) => `/api/v1/workspaces/${id}/invitations/${invitationId}`,
    PENDING_INVITATIONS: '/api/v1/workspaces/invitations/pending',
    ACCEPT_INVITATION: (id: string) => `/api/v1/workspaces/invitations/${id}/accept`,
    DECLINE_INVITATION: (id: string) => `/api/v1/workspaces/invitations/${id}/decline`,
  },

  // ── Projects ──────────────────────────────────────────
  PROJECTS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/projects`,
    DETAIL: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    MEMBERS: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/members`,
    API_TOKENS: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/api-tokens`,
    API_TOKEN: (workspaceId: string, projectId: string, tokenId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/api-tokens/${tokenId}`,
  },

  // ── Findings ──────────────────────────────────────────
  FINDINGS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/findings`,
    DETAIL: (workspaceId: string, findingId: string) => `/api/v1/workspaces/${workspaceId}/findings/${findingId}`,
    STATUS: (workspaceId: string, findingId: string) => `/api/v1/workspaces/${workspaceId}/findings/${findingId}/status`,
    ASSIGN: (workspaceId: string, findingId: string) => `/api/v1/workspaces/${workspaceId}/findings/${findingId}/assign`,
    VERIFY: (workspaceId: string, findingId: string) => `/api/v1/workspaces/${workspaceId}/findings/${findingId}/verify`,
    BULK: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/findings/bulk`,
    AI_VERIFY: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/findings/ai-verify`,
    MEMBERS: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/members`,
    GROUPS: (workspaceId: string, projectId: string) => `/api/v1/workspaces/${workspaceId}/projects/${projectId}/finding-groups`,
  },

  // ── Scans ─────────────────────────────────────────────
  SCANS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/scans`,
    LIST_REPOSITORY: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans`,
    DETAIL: (workspaceId: string, scanId: string) => `/api/v1/workspaces/${workspaceId}/scans/${scanId}`,
    FINDINGS: (workspaceId: string, scanId: string) => `/api/v1/workspaces/${workspaceId}/scans/${scanId}/findings`,
    UPLOAD: (workspaceId: string, projectId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/scans/upload`,
    REPARSE: (workspaceId: string, projectId: string, scanId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/scans/${scanId}/reparse`,
    RUN: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/scans/run`,
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
    SCHEDULE: (workspaceId: string, projectId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/projects/${projectId}/repositories/${repoId}/schedule`,
    BRANCHES: (workspaceId: string, repoId: string) =>
      `/api/v1/workspaces/${workspaceId}/repositories/${repoId}/branches`,
  },

  // ── AI Models ─────────────────────────────────────────
  AI_MODELS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/model`,
    DETAIL: (workspaceId: string, modelId: string) => `/api/v1/workspaces/${workspaceId}/model/${modelId}`,
  },

  // ── Knowledge Base ────────────────────────────────────
  KNOWLEDGE_BASE: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-base`,
    DETAIL: (workspaceId: string, entryId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-base/${entryId}`,
  },

  // ── Knowledge Sources ─────────────────────────────────
  KNOWLEDGE_SOURCES: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources`,
    DETAIL: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}`,
    ENTRIES: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}/entries`,
    SYNC: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}/sync`,
    BACKFILL: (workspaceId: string, sourceId: string) => `/api/v1/workspaces/${workspaceId}/knowledge-sources/${sourceId}/backfill`,
  },

  // ── Webhooks ──────────────────────────────────────────
  WEBHOOKS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/webhooks`,
    DETAIL: (workspaceId: string, webhookId: string) => `/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}`,
    TEST: (workspaceId: string, webhookId: string) => `/api/v1/workspaces/${workspaceId}/webhooks/${webhookId}/test`,
  },

  // ── Schedules ─────────────────────────────────────────
  SCHEDULES: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/schedules`,
    DETAIL: (workspaceId: string, scheduleId: string) => `/api/v1/workspaces/${workspaceId}/schedules/${scheduleId}`,
    TOGGLE: (workspaceId: string, scheduleId: string) => `/api/v1/workspaces/${workspaceId}/schedules/${scheduleId}/toggle`,
  },

  // ── Workspace Settings ────────────────────────────────
  WORKSPACE_SETTINGS: {
    VERIFICATION: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/settings/verification`,
  },

  // ── Source Controls ───────────────────────────────────
  SOURCE_CONTROLS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/source-controls`,
    DETAIL: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}`,
    TEST: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}/test`,
    SYNC: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}/sync`,
    IMPORT: (workspaceId: string, id: string) => `/api/v1/workspaces/${workspaceId}/source-controls/${id}/import`,
    UNINSTALL: (workspaceId: string, importId: string) => `/api/v1/workspaces/${workspaceId}/source-controls/imports/${importId}`,
    TEST_EVENT: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/source-controls/test-event`,
    REPOS: (workspaceId: string, providerId?: string) =>
      providerId
        ? `/api/v1/workspaces/${workspaceId}/source-controls/${providerId}/repos`
        : `/api/v1/workspaces/${workspaceId}/source-controls/repos`,
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

  // ── Scanners (availability) ───────────────────────────
  SCANNERS: {
    AVAILABILITY: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/scanners`,
  },

  // ── Reports ───────────────────────────────────────────
  REPORTS: {
    LIST: (workspaceId: string) => `/api/v1/workspaces/${workspaceId}/reports`,
    DETAIL: (workspaceId: string, reportId: string) => `/api/v1/workspaces/${workspaceId}/reports/${reportId}`,
    DOWNLOAD: (workspaceId: string, reportId: string) => `/api/v1/workspaces/${workspaceId}/reports/${reportId}/download`,
    PREVIEW: (workspaceId: string, reportId: string) => `/api/v1/workspaces/${workspaceId}/reports/${reportId}/preview`,
  },

  // ── Dashboard ─────────────────────────────────────────
  DASHBOARD: {
    STATS: '/api/v1/dashboard/stats',
    SCANS: '/api/v1/dashboard/scans',
    FINDINGS: '/api/v1/dashboard/findings',
    HEALTH: '/api/v1/dashboard/health',
  },

  // ── Notifications ─────────────────────────────────
  NOTIFICATIONS: {
    LIST: '/api/v1/notifications',
    UNREAD_COUNT: '/api/v1/notifications/unread-count',
  },

  // ── Audit ────────────────────────────────────────
  AUDIT: {
    LOGS: '/api/v1/audit-logs',
    ACTIVITY_LOGS: '/api/v1/activity-logs',
  },

  // ── Users ─────────────────────────────────────────────
  USERS: {
    ME: '/api/v1/users/me',
  },
} as const;

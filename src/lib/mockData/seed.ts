/**
 * Seed data — static mock data that mirrors the database schema.
 *
 * @module mockData-seed
 *
 * @remarks
 * All IDs follow a consistent pattern: `{entity}_{seq}` (e.g. `usr_01`, `ws_01`).
 * Dates use ISO 8601 format. When replacing with API calls, the response
 * shape should match these types exactly.
 */

import type {
  MockUser, MockWorkspace, MockWorkspaceMember, MockWorkspaceInvitation,
  MockTeam, MockTeamMember, MockProject, MockProjectMember, MockProjectTeam,
  MockRepository, MockScan, MockFinding, MockSourceControl,
  MockScanResult, MockFindingGroup, MockReport,
  MockQualityGate, MockAiModel, MockWebhook, MockKnowledgeSource,
  MockKnowledgeEntry, MockSchedule, MockEnvironment, MockProjectApiToken,
  MockAiVerification, MockComment,
  MockFindingHistory, MockKnowledgeBackfillJob, MockStorageFile,
  MockAuditLog, MockActivityLog, MockNotification, MockWorkspaceSetting,
} from './types';

// ─── Users ──────────────────────────────────────────────────────

/** Mock users — 5 users with different roles and verification states. */
export const users: MockUser[] = [
  { id: 'usr_01', email: 'alice@sast.dev', name: 'Alice Tan', avatarUrl: null, emailVerifiedAt: '2026-01-10T08:00:00Z', currentWorkspaceId: 'ws_01', createdAt: '2026-01-05T08:00:00Z' },
  { id: 'usr_02', email: 'bob@sast.dev', name: 'Bob Chen', avatarUrl: null, emailVerifiedAt: '2026-01-12T09:00:00Z', currentWorkspaceId: 'ws_01', createdAt: '2026-01-06T09:00:00Z' },
  { id: 'usr_03', email: 'carol@sast.dev', name: 'Carol Lee', avatarUrl: null, emailVerifiedAt: '2026-01-15T10:00:00Z', currentWorkspaceId: 'ws_01', createdAt: '2026-01-07T10:00:00Z' },
  { id: 'usr_04', email: 'dave@sast.dev', name: 'Dave Wong', avatarUrl: null, emailVerifiedAt: null, currentWorkspaceId: 'ws_01', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'usr_05', email: 'eve@sast.dev', name: 'Eve Kumar', avatarUrl: null, emailVerifiedAt: '2026-02-10T08:00:00Z', currentWorkspaceId: 'ws_01', createdAt: '2026-02-05T08:00:00Z' },
];

// ─── Workspaces ─────────────────────────────────────────────────

/** Mock workspaces — one organization + one personal workspace. */
export const workspaces: MockWorkspace[] = [
  { id: 'ws_01', name: 'SAST Integration', slug: 'sast-integration', type: 'organization', description: 'Main workspace for SAST platform development.', createdAt: '2026-01-05T08:00:00Z', createdBy: 'usr_01' },
  { id: 'ws_02', name: 'Personal Workspace', slug: 'personal-alice', type: 'personal', description: null, createdAt: '2026-01-05T08:00:00Z', createdBy: 'usr_01' },
];

// ─── Workspace Members ──────────────────────────────────────────

/** Mock workspace members — 5 members with owner/manager/reviewer/member roles. */
export const workspaceMembers: MockWorkspaceMember[] = [
  { id: 'wm_01', workspaceId: 'ws_01', userId: 'usr_01', role: 'owner', joinedAt: '2026-01-05T08:00:00Z' },
  { id: 'wm_02', workspaceId: 'ws_01', userId: 'usr_02', role: 'manager', joinedAt: '2026-01-10T08:00:00Z' },
  { id: 'wm_03', workspaceId: 'ws_01', userId: 'usr_03', role: 'reviewer', joinedAt: '2026-01-15T08:00:00Z' },
  { id: 'wm_04', workspaceId: 'ws_01', userId: 'usr_04', role: 'member', joinedAt: '2026-02-01T08:00:00Z' },
  { id: 'wm_05', workspaceId: 'ws_01', userId: 'usr_05', role: 'reviewer', joinedAt: '2026-02-10T08:00:00Z' },
];

// ─── Workspace Invitations ──────────────────────────────────────

/** Mock workspace invitations — 2 pending invitations. */
export const workspaceInvitations: MockWorkspaceInvitation[] = [
  { id: 'inv_01', workspaceId: 'ws_01', email: 'frank@sast.dev', role: 'member', token: 'tok_inv_01', acceptedAt: null, createdAt: '2026-05-20T08:00:00Z', expiresAt: '2026-06-03T08:00:00Z' },
  { id: 'inv_02', workspaceId: 'ws_01', email: 'grace@sast.dev', role: 'reviewer', token: 'tok_inv_02', acceptedAt: null, createdAt: '2026-05-25T08:00:00Z', expiresAt: '2026-06-08T08:00:00Z' },
];

// ─── Teams ──────────────────────────────────────────────────────

/** Mock teams — Security Core, Frontend, DevOps. */
export const teams: MockTeam[] = [
  { id: 'tm_01', workspaceId: 'ws_01', name: 'Security Core', slug: 'security-core', description: 'Core security scanning and verification team.', createdAt: '2026-01-20T08:00:00Z' },
  { id: 'tm_02', workspaceId: 'ws_01', name: 'Frontend', slug: 'frontend', description: 'Frontend development and UI/UX team.', createdAt: '2026-01-22T08:00:00Z' },
  { id: 'tm_03', workspaceId: 'ws_01', name: 'DevOps', slug: 'devops', description: 'Infrastructure, CI/CD, and deployment team.', createdAt: '2026-02-01T08:00:00Z' },
];

// ─── Team Members ───────────────────────────────────────────────

/** Mock team members — 6 memberships across 3 teams. */
export const teamMembers: MockTeamMember[] = [
  { id: 'tmbr_01', teamId: 'tm_01', userId: 'usr_01', role: 'admin', joinedAt: '2026-01-20T08:00:00Z' },
  { id: 'tmbr_02', teamId: 'tm_01', userId: 'usr_03', role: 'contributor', joinedAt: '2026-01-22T08:00:00Z' },
  { id: 'tmbr_03', teamId: 'tm_01', userId: 'usr_05', role: 'contributor', joinedAt: '2026-02-10T08:00:00Z' },
  { id: 'tmbr_04', teamId: 'tm_02', userId: 'usr_02', role: 'admin', joinedAt: '2026-01-22T08:00:00Z' },
  { id: 'tmbr_05', teamId: 'tm_02', userId: 'usr_04', role: 'contributor', joinedAt: '2026-02-01T08:00:00Z' },
  { id: 'tmbr_06', teamId: 'tm_03', userId: 'usr_02', role: 'admin', joinedAt: '2026-02-01T08:00:00Z' },
];

// ─── Projects ───────────────────────────────────────────────────

/** Mock projects — Backend API, Customer Web, Mobile App. */
export const projects: MockProject[] = [
  { id: 'proj_01', workspaceId: 'ws_01', name: 'Backend API', slug: 'backend-api', platform: 'node', language: 'typescript', description: 'Main backend REST API service.', createdAt: '2026-01-25T08:00:00Z' },
  { id: 'proj_02', workspaceId: 'ws_01', name: 'Customer Web', slug: 'customer-web', platform: 'web', language: 'typescript', description: 'Customer-facing web application.', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'proj_03', workspaceId: 'ws_01', name: 'Mobile App', slug: 'mobile-app', platform: 'mobile', language: 'dart', description: 'Flutter mobile application.', createdAt: '2026-02-10T08:00:00Z' },
];

// ─── Project Members ────────────────────────────────────────────

/** Mock project members — 4 memberships across 2 projects. */
export const projectMembers: MockProjectMember[] = [
  { id: 'pm_01', projectId: 'proj_01', userId: 'usr_01', role: 'owner', joinedAt: '2026-01-25T08:00:00Z' },
  { id: 'pm_02', projectId: 'proj_01', userId: 'usr_03', role: 'contributor', joinedAt: '2026-01-26T08:00:00Z' },
  { id: 'pm_03', projectId: 'proj_02', userId: 'usr_02', role: 'owner', joinedAt: '2026-02-01T08:00:00Z' },
  { id: 'pm_04', projectId: 'proj_02', userId: 'usr_04', role: 'contributor', joinedAt: '2026-02-02T08:00:00Z' },
];

// ─── Project Teams ──────────────────────────────────────────────

/** Mock project-team associations — 2 teams linked to projects. */
export const projectTeams: MockProjectTeam[] = [
  { id: 'pt_01', projectId: 'proj_01', teamId: 'tm_01', role: 'contributor', addedAt: '2026-01-26T08:00:00Z' },
  { id: 'pt_02', projectId: 'proj_02', teamId: 'tm_02', role: 'contributor', addedAt: '2026-02-01T08:00:00Z' },
];

// ─── Repositories ───────────────────────────────────────────────

/** Mock repositories — 3 repos across 3 projects. */
export const repositories: MockRepository[] = [
  { id: 'repo_01', projectId: 'proj_01', name: 'backend-api', url: 'https://gitlab.com/sast/backend-api', defaultBranch: 'main', autoScan: true },
  { id: 'repo_02', projectId: 'proj_02', name: 'customer-web', url: 'https://gitlab.com/sast/customer-web', defaultBranch: 'main', autoScan: true },
  { id: 'repo_03', projectId: 'proj_03', name: 'mobile-app', url: 'https://github.com/sast/mobile-app', defaultBranch: 'main', autoScan: false },
];

// ─── Scans ──────────────────────────────────────────────────────

/** Mock scans — 3 scans with different statuses (completed, running, failed). */
export const scans: MockScan[] = [
  { id: 'scan_01', repositoryId: 'repo_01', status: 'completed', branch: 'main', commitSha: 'a1b2c3d4', startedAt: '2026-06-04T06:00:00Z', completedAt: '2026-06-04T06:12:00Z', createdAt: '2026-06-04T06:00:00Z' },
  { id: 'scan_02', repositoryId: 'repo_02', status: 'running', branch: 'release', commitSha: 'e5f6g7h8', startedAt: '2026-06-04T07:30:00Z', completedAt: null, createdAt: '2026-06-04T07:30:00Z' },
  { id: 'scan_03', repositoryId: 'repo_01', status: 'failed', branch: 'main', commitSha: 'i9j0k1l2', startedAt: '2026-06-03T10:00:00Z', completedAt: '2026-06-03T10:05:00Z', createdAt: '2026-06-03T10:00:00Z' },
];

// ─── Findings ───────────────────────────────────────────────────

/** Mock findings — 6 findings across 1 scan with varying severity and status. */
export const findings: MockFinding[] = [
  { id: 'f_01', scanId: 'scan_01', severity: 'critical', status: 'open', filePath: 'src/routes/orders.ts', lineNumber: 88, rule: 'sql-injection', scanner: 'semgrep', message: 'Potential SQL injection in query builder', createdAt: '2026-06-04T06:05:00Z' },
  { id: 'f_02', scanId: 'scan_01', severity: 'high', status: 'open', filePath: 'src/middleware/auth.ts', lineNumber: 42, rule: 'jwt-none-alg', scanner: 'semgrep', message: 'JWT algorithm none not allowed', createdAt: '2026-06-04T06:05:00Z' },
  { id: 'f_03', scanId: 'scan_01', severity: 'medium', status: 'triaged', filePath: 'src/utils/logger.ts', lineNumber: 15, rule: 'log-sensitive', scanner: 'semgrep', message: 'Sensitive data in log output', createdAt: '2026-06-04T06:05:00Z' },
  { id: 'f_04', scanId: 'scan_01', severity: 'critical', status: 'open', filePath: 'native/parser.c', lineNumber: 42, rule: 'unchecked-strcpy', scanner: 'cppcheck', message: 'Unchecked strcpy may cause buffer overflow', createdAt: '2026-06-04T06:05:00Z' },
  { id: 'f_05', scanId: 'scan_01', severity: 'low', status: 'false_positive', filePath: 'src/config/env.ts', lineNumber: 10, rule: 'hardcoded-secret', scanner: 'gitleaks', message: 'Possible hardcoded secret', createdAt: '2026-06-04T06:05:00Z' },
  { id: 'f_06', scanId: 'scan_01', severity: 'medium', status: 'open', filePath: 'src/api/upload.ts', lineNumber: 30, rule: 'path-traversal', scanner: 'semgrep', message: 'Unsanitized file path in upload handler', createdAt: '2026-06-04T06:05:00Z' },
];

// ─── Source Controls ────────────────────────────────────────────

export const sourceControls: MockSourceControl[] = [
  { id: 'sc_01', workspaceId: 'ws_01', provider: 'gitlab', name: 'SAST GitLab', createdAt: '2026-01-10T08:00:00Z' },
  { id: 'sc_02', workspaceId: 'ws_01', provider: 'github', name: 'SAST GitHub', createdAt: '2026-02-01T08:00:00Z' },
];

// ─── Scan Results ──────────────────────────────────────────────

export const scanResults: MockScanResult[] = [
  { id: 'sr_01', scanId: 'scan_01', scanner: 'semgrep', format: 'json', parsedSummary: { critical: 4, high: 1, medium: 2, low: 1, info: 0 }, createdAt: '2026-06-04T06:12:00Z' },
  { id: 'sr_02', scanId: 'scan_01', scanner: 'gitleaks', format: 'json', parsedSummary: { critical: 0, high: 0, medium: 0, low: 1, info: 0 }, createdAt: '2026-06-04T06:12:00Z' },
];

// ─── Finding Groups ────────────────────────────────────────────

export const findingGroups: MockFindingGroup[] = [
  { id: 'fg_01', projectId: 'proj_01', fingerprint: 'a1b2c3d4e5f6', title: 'SQL Injection in query builder', firstSeenAt: '2026-06-04T06:05:00Z', lastSeenAt: '2026-06-04T06:05:00Z', findingCount: 3 },
  { id: 'fg_02', projectId: 'proj_01', fingerprint: 'b2c3d4e5f6a1', title: 'Unchecked strcpy', firstSeenAt: '2026-06-04T06:05:00Z', lastSeenAt: '2026-06-04T06:05:00Z', findingCount: 1 },
];

// ─── Reports ───────────────────────────────────────────────────

export const reports: MockReport[] = [
  { id: 'rpt_01', workspaceId: 'ws_01', type: 'security_summary', title: 'Monthly Security Summary — June 2026', format: 'pdf', filePath: '/reports/june-2026.pdf', fileSize: 245760, createdAt: '2026-06-01T08:00:00Z', createdBy: 'usr_01', createdByName: 'Alice Tan' },
  { id: 'rpt_02', workspaceId: 'ws_01', type: 'scan_detail', title: 'Backend API Scan Report', format: 'json', filePath: '/reports/backend-api-scan.json', fileSize: 12800, createdAt: '2026-06-04T07:00:00Z', createdBy: 'usr_02', createdByName: 'Bob Chen' },
];

// ─── Quality Gates ─────────────────────────────────────────────

export const qualityGates: MockQualityGate[] = [
  { id: 'qg_01', workspaceId: 'ws_01', threshold: 'high', failOnCritical: true, failOnHighTp: true, warnOnPending: true, requireHumanAck: false, pendingBehavior: 'warn', createdAt: '2026-01-10T08:00:00Z' },
];

// ─── AI Models ─────────────────────────────────────────────────

export const aiModels: MockAiModel[] = [
  { id: 'aim_01', workspaceId: 'ws_01', name: 'Qwen 2.5 72B', provider: 'modal', baseUrl: 'https://modal.com/v1', role: 'primary', priority: 1, promptPreset: 'strict', status: 'reachable', lastTestedAt: '2026-06-04T06:00:00Z', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'aim_02', workspaceId: 'ws_01', name: 'Llama 3.1 70B', provider: 'ollama', baseUrl: 'http://localhost:11434', role: 'fallback', priority: 2, promptPreset: 'standard', status: 'reachable', lastTestedAt: '2026-06-04T06:00:00Z', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'aim_03', workspaceId: 'ws_01', name: 'GPT-4o', provider: 'openai', baseUrl: 'https://api.openai.com/v1', role: 'fallback', priority: 3, promptPreset: 'strict', status: 'unreachable', lastTestedAt: '2026-05-15T08:00:00Z', createdAt: '2026-04-01T08:00:00Z' },
];

// ─── Webhooks ──────────────────────────────────────────────────

export const webhooks: MockWebhook[] = [
  { id: 'wh_01', workspaceId: 'ws_01', name: 'Slack Notifications', url: 'https://hooks.slack.com/services/T00/B00/xxx', events: ['scan.completed', 'finding.critical'], active: true, lastTriggeredAt: '2026-06-04T06:12:00Z', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'wh_02', workspaceId: 'ws_01', name: 'CI Pipeline', url: 'https://ci.example.com/webhook/sast', events: ['scan.completed', 'quality_gate.fail'], active: true, lastTriggeredAt: '2026-06-04T06:12:00Z', createdAt: '2026-03-01T08:00:00Z' },
];

// ─── Knowledge Base ────────────────────────────────────────────

export const knowledgeSources: MockKnowledgeSource[] = [
  { id: 'ks_01', workspaceId: 'ws_01', name: 'NVD Feed', type: 'nvd', url: 'https://nvd.nist.gov/feeds/json/cve/2.0', status: 'connected', entryCount: 15420, lastSyncedAt: '2026-06-04T00:00:00Z', createdAt: '2026-01-15T08:00:00Z' },
  { id: 'ks_02', workspaceId: 'ws_01', name: 'Custom Rules', type: 'manual', url: null, status: 'connected', entryCount: 24, lastSyncedAt: '2026-06-01T08:00:00Z', createdAt: '2026-02-01T08:00:00Z' },
];

export const knowledgeEntries: MockKnowledgeEntry[] = [
  { id: 'ke_01', sourceId: 'ks_01', cweId: 'CWE-89', title: 'SQL Injection', severity: 'critical', remediation: 'Use parameterized queries', muted: false, usedByAiCount: 42, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'ke_02', sourceId: 'ks_01', cweId: 'CWE-79', title: 'Cross-Site Scripting (XSS)', severity: 'high', remediation: 'Sanitize user input', muted: false, usedByAiCount: 38, createdAt: '2026-01-15T08:00:00Z' },
  { id: 'ke_03', sourceId: 'ks_02', cweId: null, title: 'Custom: Hardcoded API Key', severity: 'high', remediation: 'Move to environment variables', muted: false, usedByAiCount: 12, createdAt: '2026-02-10T08:00:00Z' },
];

// ─── Schedules ─────────────────────────────────────────────────

export const schedules: MockSchedule[] = [
  { id: 'sch_01', repositoryId: 'repo_01', repositoryName: 'backend-api', branch: 'main', timezone: 'UTC', cronExpression: '0 2 * * 1-5', active: true, lastRunAt: '2026-06-04T02:00:00Z', nextRunAt: '2026-06-05T02:00:00Z', createdAt: '2026-03-01T08:00:00Z' },
  { id: 'sch_02', repositoryId: 'repo_02', repositoryName: 'customer-web', branch: 'main', timezone: 'Asia/Jakarta', cronExpression: '0 6 * * 1', active: true, lastRunAt: '2026-06-02T06:00:00Z', nextRunAt: '2026-06-09T06:00:00Z', createdAt: '2026-04-01T08:00:00Z' },
];

// ─── Environments ──────────────────────────────────────────────

export const environments: MockEnvironment[] = [
  { id: 'env_01', projectId: 'proj_01', name: 'Production', type: 'production', isDefault: true },
  { id: 'env_02', projectId: 'proj_01', name: 'Staging', type: 'development', isDefault: false },
  { id: 'env_03', projectId: 'proj_02', name: 'Production', type: 'production', isDefault: true },
];

// ─── Project API Tokens ────────────────────────────────────────

export const projectApiTokens: MockProjectApiToken[] = [
  { id: 'pat_01', projectId: 'proj_01', name: 'CI Pipeline', tokenPrefix: 'sast_p_a1b2..', permissions: ['scans:upload'], lastUsedAt: '2026-06-04T06:00:00Z', createdAt: '2026-03-01T08:00:00Z', expiresAt: '2026-12-01T08:00:00Z', revokedAt: null },
  { id: 'pat_02', projectId: 'proj_01', name: 'GitHub Actions', tokenPrefix: 'sast_p_c3d4..', permissions: ['scans:upload'], lastUsedAt: '2026-06-03T14:00:00Z', createdAt: '2026-04-15T10:00:00Z', expiresAt: '2026-12-15T10:00:00Z', revokedAt: null },
  { id: 'pat_03', projectId: 'proj_02', name: 'Dev Staging', tokenPrefix: 'sast_p_e5f6..', permissions: ['scans:upload'], lastUsedAt: '2026-06-02T08:00:00Z', createdAt: '2026-02-20T09:00:00Z', expiresAt: '2026-08-20T09:00:00Z', revokedAt: null },
  { id: 'pat_04', projectId: 'proj_01', name: 'Old Pipeline (revoked)', tokenPrefix: 'sast_p_g7h8..', permissions: ['scans:upload'], lastUsedAt: null, createdAt: '2025-12-01T08:00:00Z', expiresAt: null, revokedAt: '2026-01-15T10:00:00Z' },
];

// ─── AI Verifications ──────────────────────────────────────────

export const aiVerifications: MockAiVerification[] = [
  { id: 'av_01', findingId: 'f_01', modelId: 'aim_01', verdict: 'true_positive', confidence: 0.94, explanation: 'The query builder uses string interpolation to construct SQL. An attacker can inject SQL via the search parameter.', dataFlow: 'request.query.search → queryBuilder.where(search)', taintSource: 'HTTP request query parameter', fixSuggestion: 'Use parameterized queries or prepared statements.', latencyMs: 1250, createdAt: '2026-06-04T06:06:00Z' },
  { id: 'av_02', findingId: 'f_02', modelId: 'aim_01', verdict: 'true_positive', confidence: 0.88, explanation: 'JWT verification accepts algorithm "none", allowing token forgery.', dataFlow: 'request.headers.authorization → jwt.verify()', taintSource: 'Authorization header', fixSuggestion: 'Explicitly set allowed algorithms in jwt.verify().', latencyMs: 980, createdAt: '2026-06-04T06:06:00Z' },
  { id: 'av_03', findingId: 'f_04', modelId: 'aim_01', verdict: 'true_positive', confidence: 0.91, explanation: 'strcpy does not check source buffer length, potential buffer overflow.', dataFlow: 'argv[] → strcpy(buf, src)', taintSource: 'Command-line argument', fixSuggestion: 'Use strncpy or strlcpy with bounds checking.', latencyMs: 870, createdAt: '2026-06-04T06:06:00Z' },
  { id: 'av_04', findingId: 'f_05', modelId: 'aim_01', verdict: 'false_positive', confidence: 0.96, explanation: 'This is a configuration value parsed from environment variables, not a hardcoded secret.', dataFlow: null, taintSource: null, fixSuggestion: null, latencyMs: 750, createdAt: '2026-06-04T06:06:00Z' },
];

// ─── Comments ──────────────────────────────────────────────────

export const comments: MockComment[] = [
  { id: 'cmt_01', findingId: 'f_01', content: 'Confirmed — the search parameter in GET /api/orders directly concatenates into the SQL query. Needs immediate fix.', createdByName: 'Bob Chen', createdAt: '2026-06-04T08:00:00Z', updatedAt: '2026-06-04T08:00:00Z' },
  { id: 'cmt_02', findingId: 'f_01', content: 'I have started working on the fix using prepared statements. PR incoming.', createdByName: 'Alice Tan', createdAt: '2026-06-04T09:30:00Z', updatedAt: '2026-06-04T09:30:00Z' },
];

// ─── Finding History ───────────────────────────────────────────

export const findingHistory: MockFindingHistory[] = [
  { id: 'fh_01', findingId: 'f_01', field: 'status', oldValue: 'open', newValue: 'triaged', createdByName: 'Bob Chen', createdAt: '2026-06-04T08:00:00Z' },
  { id: 'fh_02', findingId: 'f_01', field: 'assigned_to', oldValue: null, newValue: 'usr_02', createdByName: 'Alice Tan', createdAt: '2026-06-04T09:00:00Z' },
];

// ─── Knowledge Backfill Jobs ───────────────────────────────────

export const knowledgeBackfillJobs: MockKnowledgeBackfillJob[] = [
  { id: 'kbj_01', sourceId: 'ks_01', sourceType: 'nvd', status: 'completed', rangeStart: '2024-01-01T00:00:00Z', rangeEnd: '2024-12-31T00:00:00Z', importedCount: 15420, createdAt: '2026-01-15T08:00:00Z' },
];

// ─── Storage Files ─────────────────────────────────────────────

export const storageFiles: MockStorageFile[] = [
  { id: 'sf_01', workspaceId: 'ws_01', fileName: 'june-2026.pdf', filePath: '/reports/june-2026.pdf', fileSize: 245760, mimeType: 'application/pdf', storageProvider: 'local', createdAt: '2026-06-01T08:00:00Z' },
];

// ─── Audit Logs ────────────────────────────────────────────────

export const auditLogs: MockAuditLog[] = [
  { id: 'al_01', workspaceId: 'ws_01', userId: 'usr_01', userName: 'Alice Tan', action: 'signin', resourceType: null, resourceId: null, ipAddress: '192.168.1.100', createdAt: '2026-06-04T08:00:00Z' },
  { id: 'al_02', workspaceId: 'ws_01', userId: 'usr_02', userName: 'Bob Chen', action: 'project.create', resourceType: 'project', resourceId: 'proj_02', ipAddress: '192.168.1.101', createdAt: '2026-02-01T08:00:00Z' },
  { id: 'al_03', workspaceId: 'ws_01', userId: 'usr_01', userName: 'Alice Tan', action: 'member.invite', resourceType: 'member', resourceId: null, ipAddress: '192.168.1.100', createdAt: '2026-05-20T08:00:00Z' },
];

// ─── Activity Logs ─────────────────────────────────────────────

export const activityLogs: MockActivityLog[] = [
  { id: 'acl_01', workspaceId: 'ws_01', userId: 'usr_02', userName: 'Bob Chen', type: 'scan.completed', description: 'Scan completed on backend-api/main with 8 findings', createdAt: '2026-06-04T06:12:00Z' },
  { id: 'acl_02', workspaceId: 'ws_01', userId: 'usr_01', userName: 'Alice Tan', type: 'member.joined', description: 'Carol Lee accepted the invitation and joined the workspace', createdAt: '2026-01-15T08:00:00Z' },
];

// ─── Notifications ─────────────────────────────────────────────

export const notifications: MockNotification[] = [
  { id: 'n_01', userId: 'usr_01', type: 'finding.critical', title: 'Critical finding detected in backend-api', data: { findingId: 'f_01', repository: 'backend-api' }, readAt: null, createdAt: '2026-06-04T06:05:00Z' },
  { id: 'n_02', userId: 'usr_01', type: 'scan.completed', title: 'Scan completed on backend-api', data: { scanId: 'scan_01', findings: 8 }, readAt: '2026-06-04T08:00:00Z', createdAt: '2026-06-04T06:12:00Z' },
];

// ─── Workspace Settings ────────────────────────────────────────

export const workspaceSettings: MockWorkspaceSetting[] = [
  { id: 'ws_set_01', workspaceId: 'ws_01', key: 'scan.auto_trigger_on_push', value: 'true' },
  { id: 'ws_set_02', workspaceId: 'ws_01', key: 'notifications.critical_only', value: 'false' },
  { id: 'ws_set_03', workspaceId: 'ws_01', key: 'ai.verification_enabled', value: 'true' },
];

// ─── Scan Details (rich data for drawer) ─────────────────────────

export const scanDetails: Record<string, { id: string; repositoryName: string; branch: string; status: string; startedAt: string; completedAt: string | null; createdAt: string; origin: 'managed' | 'external_upload'; profileName: string | null; findingsCount: number; criticalCount: number; scannerResults: Array<{ scanner: string; status: string; findingsCount: number; durationSeconds: number; error?: string }>; severityBreakdown: { critical: number; high: number; medium: number; low: number; info: number }; aiStats?: { enabled: boolean; verified: number; total: number; truePositives: number; falsePositives: number; pending: number }; timeline: Array<{ id: string; type: string; description: string; timestamp: string; durationSeconds?: number; metadata?: Record<string, unknown> }> }> = {
  scan_01: {
    id: 'scan_01', repositoryName: 'backend-api', branch: 'main', status: 'completed', startedAt: '2026-06-04T06:00:00Z', completedAt: '2026-06-04T06:12:00Z', createdAt: '2026-06-04T06:00:00Z',
    origin: 'managed', profileName: 'Standard SAST', findingsCount: 8, criticalCount: 4,
    scannerResults: [
      { scanner: 'semgrep', status: 'completed', findingsCount: 7, durationSeconds: 89 },
      { scanner: 'gitleaks', status: 'completed', findingsCount: 1, durationSeconds: 34 },
    ],
    severityBreakdown: { critical: 4, high: 1, medium: 2, low: 1, info: 0 },
    aiStats: { enabled: true, verified: 6, total: 8, truePositives: 5, falsePositives: 1, pending: 2 },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Scan triggered via CI upload', timestamp: '2026-06-04T06:00:00Z' },
      { id: 't2', type: 'scanning', description: 'Semgrep scan started', timestamp: '2026-06-04T06:00:02Z', metadata: { scanner: 'semgrep' } },
      { id: 't3', type: 'scanning', description: 'Gitleaks scan started', timestamp: '2026-06-04T06:01:31Z', metadata: { scanner: 'gitleaks' } },
      { id: 't4', type: 'parsing', description: 'Parsing semgrep results', timestamp: '2026-06-04T06:11:31Z', durationSeconds: 12 },
      { id: 't5', type: 'ai_verifying', description: 'AI verification started', timestamp: '2026-06-04T06:11:43Z', metadata: { model: 'qwen2.5-72b', findings: 8 } },
      { id: 't6', type: 'completed', description: 'Scan completed successfully', timestamp: '2026-06-04T06:12:00Z', durationSeconds: 720 },
    ],
  },
  scan_02: {
    id: 'scan_02', repositoryName: 'customer-web', branch: 'release', status: 'running', startedAt: '2026-06-04T07:30:00Z', completedAt: null, createdAt: '2026-06-04T07:30:00Z',
    origin: 'managed', profileName: null, findingsCount: 9, criticalCount: 1,
    scannerResults: [
      { scanner: 'semgrep', status: 'completed', findingsCount: 8, durationSeconds: 120 },
      { scanner: 'gitleaks', status: 'completed', findingsCount: 1, durationSeconds: 45 },
    ],
    severityBreakdown: { critical: 1, high: 2, medium: 4, low: 2, info: 0 },
    aiStats: { enabled: true, verified: 9, total: 9, truePositives: 7, falsePositives: 2, pending: 0 },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Manual scan triggered', timestamp: '2026-06-04T07:30:00Z' },
      { id: 't2', type: 'scanning', description: 'Scanners running', timestamp: '2026-06-04T07:30:05Z' },
    ],
  },
  scan_03: {
    id: 'scan_03', repositoryName: 'backend-api', branch: 'main', status: 'failed', startedAt: '2026-06-03T10:00:00Z', completedAt: '2026-06-03T10:05:00Z', createdAt: '2026-06-03T10:00:00Z',
    origin: 'managed', profileName: null, findingsCount: 0, criticalCount: 0,
    scannerResults: [
      { scanner: 'semgrep', status: 'failed', findingsCount: 0, durationSeconds: 0, error: 'Timeout: scan exceeded 300s limit' },
    ],
    severityBreakdown: { critical: 0, high: 0, medium: 0, low: 0, info: 0 },
    timeline: [
      { id: 't1', type: 'triggered', description: 'Scan triggered', timestamp: '2026-06-03T10:00:00Z' },
      { id: 't2', type: 'failed', description: 'Scan failed — timeout', timestamp: '2026-06-03T10:05:00Z', metadata: { error: 'Timeout' } },
    ],
  },
};

// ─── Scan Findings (rich data for FindingItem) ───────────────────

export const scanFindings: Array<{
  id: string; scanId: string; repositoryName: string; projectName: string; severity: string;
  status: string; filePath: string; lineNumber: number; scanner: string; rule: string;
  message: string; cwe?: string; groundTruth?: string; codeSnippet?: string;
  aiVerdict?: string; aiConfidence?: number; cweId?: string; description?: string;
  assignedTo?: string; assignedToName?: string;
  aiAnalysis?: Record<string, { verdict: string; confidence: number; explanation: string; dataFlow: string; taintSource: string; matchDetail: string; likelyCwe: string[]; fixSuggestion: string; model: string; raw: string }>;
}> = [
  { id: 'sf_01', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'critical', status: 'open', filePath: 'src/routes/orders.ts', lineNumber: 88, scanner: 'semgrep', rule: 'sql-injection', message: 'Potential SQL injection via string interpolation', cwe: 'CWE-89', groundTruth: 'true_positive', aiVerdict: 'true_positive', aiConfidence: 94, cweId: 'CWE-89', description: 'SQL injection', codeSnippet: 'const query = `SELECT * FROM users WHERE id = ${req.query.id}`;',
    aiAnalysis: { 'qwen2.5-72b': { verdict: 'true_positive', confidence: 94, explanation: 'String interpolation in SQL query allows attacker to inject SQL.', dataFlow: 'req.query.id → query string → db.query()', taintSource: 'HTTP request query parameter', matchDetail: 'Template literal with unsanitized input', likelyCwe: ['CWE-89'], fixSuggestion: 'Use parameterized queries.', model: 'qwen2.5-72b', raw: '' } } },
  { id: 'sf_02', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'high', status: 'open', filePath: 'src/middleware/auth.ts', lineNumber: 42, scanner: 'semgrep', rule: 'jwt-none-alg', message: 'JWT verification accepts algorithm "none"', cwe: 'CWE-347', groundTruth: 'true_positive', aiVerdict: 'true_positive', aiConfidence: 88, cweId: 'CWE-347', description: 'JWT none algorithm', codeSnippet: 'jwt.verify(token, SECRET)',
    aiAnalysis: { 'qwen2.5-72b': { verdict: 'true_positive', confidence: 88, explanation: 'JWT verification accepts "none" algorithm, allowing token forgery.', dataFlow: 'req.headers.authorization → jwt.verify()', taintSource: 'Authorization header', matchDetail: 'verify() with no algorithm check', likelyCwe: ['CWE-347'], fixSuggestion: 'Explicitly set allowed algorithms.', model: 'qwen2.5-72b', raw: '' } } },
  { id: 'sf_03', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'medium', status: 'open', filePath: 'src/api/upload.ts', lineNumber: 30, scanner: 'semgrep', rule: 'path-traversal', message: 'Unsanitized file path in upload handler', aiVerdict: 'pending', aiConfidence: 72, codeSnippet: 'res.sendFile(req.query.file)' },
  { id: 'sf_04', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'critical', status: 'open', filePath: 'native/parser.c', lineNumber: 42, scanner: 'cppcheck', rule: 'unchecked-strcpy', message: 'strcpy does not check source buffer length', cwe: 'CWE-120', groundTruth: 'true_positive', aiVerdict: 'true_positive', aiConfidence: 91, cweId: 'CWE-120', description: 'Buffer overflow', codeSnippet: 'strcpy(buf, src);',
    aiAnalysis: { 'qwen2.5-72b': { verdict: 'true_positive', confidence: 91, explanation: 'strcpy may cause buffer overflow.', dataFlow: 'argv[] → strcpy(buf, src)', taintSource: 'Command-line argument', matchDetail: 'Unbounded string copy', likelyCwe: ['CWE-120'], fixSuggestion: 'Use strncpy or strlcpy.', model: 'qwen2.5-72b', raw: '' } } },
  { id: 'sf_05', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'low', status: 'false_positive', filePath: 'src/config/env.ts', lineNumber: 10, scanner: 'gitleaks', rule: 'hardcoded-secret', message: 'Possible hardcoded secret', groundTruth: 'false_positive', aiVerdict: 'false_positive', aiConfidence: 96,
    aiAnalysis: { 'qwen2.5-72b': { verdict: 'false_positive', confidence: 96, explanation: 'Configuration value from env vars, not hardcoded.', dataFlow: '', taintSource: '', matchDetail: '', likelyCwe: [], fixSuggestion: '', model: 'qwen2.5-72b', raw: '' } } },
  { id: 'sf_06', scanId: 'scan_01', repositoryName: 'backend-api', projectName: 'Backend API', severity: 'medium', status: 'open', filePath: 'src/utils/logger.ts', lineNumber: 15, scanner: 'semgrep', rule: 'log-sensitive', message: 'Sensitive data in log output', aiVerdict: 'pending', aiConfidence: 65 },
];

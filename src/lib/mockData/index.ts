/**
 * Mock data helper functions — query functions over in-memory seed data.
 *
 * @module mockData-helpers
 *
 * @remarks
 * These functions simulate database queries for frontend development.
 * Each function returns data shaped to match the future API response.
 * When the real API is ready, replace these with fetch calls.
 */

import {
  users, workspaces, workspaceMembers, workspaceInvitations,
  teams, teamMembers, projects, projectMembers, projectTeams,
  repositories, scans, findings, sourceControls,
  scanResults, findingGroups, reports, qualityGates, aiModels,
  webhooks, knowledgeSources, knowledgeEntries, schedules,
  environments, projectApiTokens, aiVerifications, comments,
  findingHistory, knowledgeBackfillJobs, storageFiles,
  auditLogs, activityLogs, notifications, workspaceSettings,
  scanDetails, scanFindings,
} from './seed';
import type {
  MockUser, MockWorkspace, MockWorkspaceMember, MockWorkspaceInvitation,
  MockTeam, MockProject,
  MockRepository, MockScan, MockFinding,
  MockSourceControl, MockScanExtended, MockScanResult,
  MockFindingGroup, MockFindingExtended, MockRepositoryExtended, MockReport,
  MockQualityGate, MockAiModel, MockWebhook, MockKnowledgeSource,
  MockKnowledgeEntry, MockSchedule, MockProfile,
  MockEnvironment, MockProjectApiToken, MockAiVerification,
  MockComment, MockFindingHistory, MockKnowledgeBackfillJob,
  MockStorageFile, MockAuditLog, MockActivityLog,
  MockNotification, MockWorkspaceSetting,
} from './types';
import type { Team, TeamMember, Project } from '@/commons/types';

// ─── Generic Pagination Helper ─────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; lastPage: number };
}

/**
 * Generic server-side pagination over an in-memory array.
 * Simulates API filtering, sorting, and pagination.
 */
export function paginate<T>(rows: T[], params: { page?: number; perPage?: number; search?: string; searchFields?: (keyof T)[]; sort?: string; order?: 'ASC' | 'DESC'; filters?: Record<string, string> }): PaginatedResult<T> {
  let result = [...rows];

  // Filter by exact-match filters
  if (params.filters) {
    for (const [key, value] of Object.entries(params.filters)) {
      if (value) {
        result = result.filter((r) => String(r[key as keyof T] ?? '') === value);
      }
    }
  }

  // Search across specified fields
  if (params.search && params.searchFields) {
    const q = params.search.toLowerCase();
    result = result.filter((r) =>
      params.searchFields!.some((field) => String(r[field] ?? '').toLowerCase().includes(q)),
    );
  }

  // Sort
  if (params.sort) {
    const dir = params.order === 'DESC' ? -1 : 1;
    result.sort((a, b) => {
      const aVal = a[params.sort as keyof T];
      const bVal = b[params.sort as keyof T];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }

  const total = result.length;
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 10;
  const lastPage = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  return { data: result.slice(start, start + perPage), meta: { total, page, perPage, lastPage } };
}

// ─── User Helpers ───────────────────────────────────────────────

/** Find a user by ID. @example `getUserById('usr_01')?.name → 'Alice Tan'` */
export function getUserById(id: string): MockUser | undefined {
  return users.find((u) => u.id === id);
}

/** Find a user by email. @example `getUserByEmail('alice@sast.dev')?.id → 'usr_01'` */
export function getUserByEmail(email: string): MockUser | undefined {
  return users.find((u) => u.email === email);
}

// ─── Workspace Helpers ──────────────────────────────────────────

/** Find a workspace by ID. @example `getWorkspaceById('ws_01')?.name → 'SAST Integration'` */
export function getWorkspaceById(id: string): MockWorkspace | undefined {
  return workspaces.find((w) => w.id === id);
}

/** Find a workspace by slug. @example `getWorkspaceBySlug('sast-integration')` */
export function getWorkspaceBySlug(slug: string): MockWorkspace | undefined {
  return workspaces.find((w) => w.slug === slug);
}

/** Get all members of a workspace with user details. @example `getWorkspaceMembers('ws_01').map(m => m.user.name)` */
export function getWorkspaceMembers(workspaceId: string): Array<MockWorkspaceMember & { user: MockUser }> {
  return workspaceMembers
    .filter((m) => m.workspaceId === workspaceId)
    .map((m) => ({ ...m, user: users.find((u) => u.id === m.userId)! }))
    .filter((m) => m.user);
}

/** Count members in a workspace. @example `getWorkspaceMemberCount('ws_01') → 5` */
export function getWorkspaceMemberCount(workspaceId: string): number {
  return workspaceMembers.filter((m) => m.workspaceId === workspaceId).length;
}

/** Get pending invitations for a workspace. @example `getWorkspaceInvitations('ws_01').length → 2` */
export function getWorkspaceInvitations(workspaceId: string): MockWorkspaceInvitation[] {
  return workspaceInvitations.filter((i) => i.workspaceId === workspaceId && !i.acceptedAt);
}

/** Count pending invitations. @example `getWorkspaceInvitationCount('ws_01') → 2` */
export function getWorkspaceInvitationCount(workspaceId: string): number {
  return workspaceInvitations.filter((i) => i.workspaceId === workspaceId && !i.acceptedAt).length;
}

/** Check if a user is a member of a workspace. @example `isWorkspaceMember('ws_01', 'usr_01') → true` */
export function isWorkspaceMember(workspaceId: string, userId: string): boolean {
  return workspaceMembers.some((m) => m.workspaceId === workspaceId && m.userId === userId);
}

/** Get a user's role in a workspace. @example `getWorkspaceRole('ws_01', 'usr_01') → 'owner'` */
export function getWorkspaceRole(workspaceId: string, userId: string): string | undefined {
  return workspaceMembers.find((m) => m.workspaceId === workspaceId && m.userId === userId)?.role;
}

// ─── Team Helpers ───────────────────────────────────────────────

/** Get all teams in a workspace with member/project counts. @example `getTeamsByWorkspace('ws_01').map(t => t.name)` */
export function getTeamsByWorkspace(workspaceId: string): Team[] {
  return teams
    .filter((t) => t.workspaceId === workspaceId)
    .map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description ?? '',
      memberCount: teamMembers.filter((tm) => tm.teamId === t.id).length,
      projects: projectTeams.filter((pt) => pt.teamId === t.id).map((pt) => projects.find((p) => p.id === pt.projectId)?.name ?? ''),
      createdAt: t.createdAt,
    })) as Team[];
}

/** Find a team by ID. @example `getTeamById('tm_01')?.name → 'Security Core'` */
export function getTeamById(id: string): MockTeam | undefined {
  return teams.find((t) => t.id === id);
}

/** Get members of a team with user details. @example `getTeamMembers('tm_01').map(m => m.user.name)` */
export function getTeamMembers(teamId: string): TeamMember[] {
  return teamMembers
    .filter((tm) => tm.teamId === teamId)
    .map((tm) => {
      const user = users.find((u) => u.id === tm.userId);
      return { id: tm.id, userId: tm.userId, name: user?.name ?? '', email: user?.email ?? '', role: tm.role, joinedAt: tm.joinedAt };
    })
    .filter((tm) => tm.name) as unknown as TeamMember[];
}

/** Count members in a team. @example `getTeamMemberCount('tm_01') → 3` */
export function getTeamMemberCount(teamId: string): number {
  return teamMembers.filter((tm) => tm.teamId === teamId).length;
}

/** Get teams associated with a project. @example `getTeamsByProject('proj_01').map(t => t.name)` */
export function getTeamsByProject(projectId: string): MockTeam[] {
  const teamIds = projectTeams.filter((pt) => pt.projectId === projectId).map((pt) => pt.teamId);
  return teams.filter((t) => teamIds.includes(t.id));
}

// ─── Project Helpers ────────────────────────────────────────────

/** Get all projects in a workspace with team/member/repo/scan counts. @example `getProjectsByWorkspace('ws_01')` */
export function getProjectsByWorkspace(workspaceId: string): Project[] {
  return projects
    .filter((p) => p.workspaceId === workspaceId)
    .map((p) => {
      const teamIds = projectTeams.filter((pt) => pt.projectId === p.id).map((pt) => pt.teamId);
      const teamNames = teams.filter((t) => teamIds.includes(t.id)).map((t) => t.name);
      const memberIds = projectMembers.filter((pm) => pm.projectId === p.id).map((pm) => pm.userId);
      const memberNames = users.filter((u) => memberIds.includes(u.id)).map((u) => u.name);
      const repoNames = repositories.filter((r) => r.projectId === p.id).map((r) => r.name);
      return {
        id: p.id,
        name: p.name,
        description: p.description ?? '',
        lead: memberNames[0] ?? '',
        repositories: repoNames,
        teams: teamNames,
        members: memberNames,
        automation: [],
        createdAt: p.createdAt,
      };
    });
}

/** Find a project by ID. @example `getProjectById('proj_01')?.name → 'Backend API'` */
export function getProjectById(id: string): MockProject | undefined {
  return projects.find((p) => p.id === id);
}

/** Get repositories for a project. @example `getProjectRepositories('proj_01').length → 1` */
export function getProjectRepositories(projectId: string): MockRepository[] {
  return repositories.filter((r) => r.projectId === projectId);
}

/** Count members in a project. @example `getProjectMemberCount('proj_01') → 2` */
export function getProjectMemberCount(projectId: string): number {
  return projectMembers.filter((pm) => pm.projectId === projectId).length;
}

// ─── Repository Helpers ─────────────────────────────────────────

/** Find a repository by ID. @example `getRepositoryById('repo_01')?.name → 'backend-api'` */
export function getRepositoryById(id: string): MockRepository | undefined {
  return repositories.find((r) => r.id === id);
}

/** Count repositories across all projects in a workspace. @example `getRepositoryCountByWorkspace('ws_01') → 3` */
export function getRepositoryCountByWorkspace(workspaceId: string): number {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  return repositories.filter((r) => projectIds.includes(r.projectId)).length;
}

// ─── Scan Helpers ───────────────────────────────────────────────

/** Get all scans for repos in a workspace. @example `getScansByWorkspace('ws_01').length → 3` */
export function getScansByWorkspace(workspaceId: string): MockScan[] {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  const repoIds = repositories.filter((r) => projectIds.includes(r.projectId)).map((r) => r.id);
  return scans.filter((s) => repoIds.includes(s.repositoryId));
}

/** Count currently running scans. @example `getActiveScanCount('ws_01') → 1` */
export function getActiveScanCount(workspaceId: string): number {
  return getScansByWorkspace(workspaceId).filter((s) => s.status === 'running').length;
}

/** Get a scan with its repository details. @example `getScanWithRepo('scan_01')?.repository.name` */
export function getScanWithRepo(scanId: string): (MockScan & { repository: MockRepository }) | undefined {
  const scan = scans.find((s) => s.id === scanId);
  if (!scan) return undefined;
  const repo = repositories.find((r) => r.id === scan.repositoryId);
  if (!repo) return undefined;
  return { ...scan, repository: repo };
}

// ─── Finding Helpers ────────────────────────────────────────────

/** Get findings for a specific scan. @example `getFindingsByScan('scan_01').length → 6` */
export function getFindingsByScan(scanId: string): MockFinding[] {
  return findings.filter((f) => f.scanId === scanId);
}

/** Count critical open findings in a workspace. @example `getCriticalFindingCount('ws_01') → 2` */
export function getCriticalFindingCount(workspaceId: string): number {
  const scanIds = getScansByWorkspace(workspaceId).map((s) => s.id);
  return findings.filter((f) => scanIds.includes(f.scanId) && f.severity === 'critical' && f.status === 'open').length;
}

/** Count all open findings in a workspace. @example `getOpenFindingCount('ws_01') → 5` */
export function getOpenFindingCount(workspaceId: string): number {
  const scanIds = getScansByWorkspace(workspaceId).map((s) => s.id);
  return findings.filter((f) => scanIds.includes(f.scanId) && f.status === 'open').length;
}

// ─── Dashboard Helpers ──────────────────────────────────────────

/** Get dashboard summary stats. @example `getDashboardStats('ws_01') → { connectedRepos: 3, ... }` */
export function getDashboardStats(workspaceId: string) {
  return {
    connectedRepos: getRepositoryCountByWorkspace(workspaceId),
    activeScans: getActiveScanCount(workspaceId),
    criticalFindings: getCriticalFindingCount(workspaceId),
    awaitingAi: findings.filter((f) => f.status === 'open' && f.severity === 'medium').length,
  };
}

// ─── P1: Source Control Helpers ─────────────────────────────────

/** Get source controls for a workspace. @example `getSourceControlsByWorkspace('ws_01').length → 2` */
export function getSourceControlsByWorkspace(workspaceId: string): MockSourceControl[] {
  return sourceControls.filter((sc) => sc.workspaceId === workspaceId);
}

/** Get repositories with project name and source control info. */
export function getRepositoriesByWorkspace(workspaceId: string): MockRepositoryExtended[] {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  return repositories
    .filter((r) => projectIds.includes(r.projectId))
    .map((r) => {
      const provider = r.url.includes('github.com') ? 'github' : r.url.includes('gitlab.com') ? 'gitlab' : r.url.includes('gitea') ? 'gitea' : null;
      return {
        ...r,
        sourceControlId: r.projectId === 'proj_01' ? 'sc_01' : 'sc_02',
        connectionType: 'scm' as const,
        lastSyncedAt: '2026-06-04T05:00:00Z',
        projectName: projects.find((p) => p.id === r.projectId)?.name ?? '',
        provider,
      };
    });
}

// ─── P1: Extended Scan Helpers ─────────────────────────────────

/** Get scans with repository/project names, findings counts. */
export function getScansExtendedByWorkspace(workspaceId: string): MockScanExtended[] {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  const repoMap = new Map(repositories.map((r) => [r.id, r]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const projectByRepo = new Map(repositories.map((r) => [r.id, projectMap.get(r.projectId)]));

  return scans
    .filter((s) => {
      const repo = repoMap.get(s.repositoryId);
      return repo && projectIds.includes(repo.projectId);
    })
    .map((s) => {
      const repo = repoMap.get(s.repositoryId)!;
      const project = projectByRepo.get(s.repositoryId);
      const scanFindings = findings.filter((f) => f.scanId === s.id);
      return {
        ...s,
        repositoryName: repo.name,
        projectName: project?.name ?? '',
        origin: 'managed' as const,
        triggerSource: 'manual' as const,
        profileName: null,
        findingsCount: scanFindings.length,
        criticalCount: scanFindings.filter((f) => f.severity === 'critical').length,
      };
    });
}

/** Get scan results for a specific scan. */
export function getScanResultsByScan(scanId: string): MockScanResult[] {
  return scanResults.filter((sr) => sr.scanId === scanId);
}

// ─── P1: Finding Group Helpers ─────────────────────────────────

/** Get finding groups for a project. */
export function getFindingGroupsByProject(projectId: string): MockFindingGroup[] {
  return findingGroups.filter((fg) => fg.projectId === projectId);
}

// ─── P1: Extended Finding Helpers ───────────────────────────────

/** Get findings with repository/project names, AI verdict, CWE. */
export function getFindingsExtendedByWorkspace(workspaceId: string): MockFindingExtended[] {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  const scanIds = scans
    .filter((s) => {
      const repo = repositories.find((r) => r.id === s.repositoryId);
      return repo && projectIds.includes(repo.projectId);
    })
    .map((s) => s.id);
  const repoMap = new Map(repositories.map((r) => [r.id, r]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return findings
    .filter((f) => scanIds.includes(f.scanId))
    .map((f) => {
      const scan = scans.find((s) => s.id === f.scanId);
      const repo = scan ? repoMap.get(scan.repositoryId) : undefined;
      const project = repo ? projectMap.get(repo.projectId) : undefined;
      const repoName = repo?.name ?? '';
      const fileName = f.lineNumber ? `${f.filePath}:${f.lineNumber}` : f.filePath;
      return {
        id: f.id,
        scanId: f.scanId,
        rule: f.rule,
        repo: repoName,
        file: fileName,
        severity: f.severity,
        scanner: f.scanner,
        verdict: f.status === 'false_positive' ? 'FP' : f.severity === 'critical' ? 'TP' : f.severity === 'high' ? 'TP' : 'Pending',
        model: f.severity === 'critical' || f.severity === 'high' ? 'sast-qwen25-coder-sva:latest' : 'Not verified',
        confidence: f.severity === 'critical' ? 94 : f.severity === 'high' ? 88 : null,
        assignee: null,
        status: f.status,
        cwe: f.severity === 'critical' ? 'CWE-89' : f.rule === 'unchecked-strcpy' ? 'CWE-120' : 'CWE-0',
        filePath: f.filePath,
        lineNumber: f.lineNumber,
        message: f.message,
        repositoryName: repoName,
        projectName: project?.name ?? '',
        cweId: f.severity === 'critical' ? 'CWE-89' : f.rule === 'unchecked-strcpy' ? 'CWE-120' : null,
        description: f.message,
        codeSnippet: null,
        createdAt: f.createdAt,
        assignedTo: null,
        assignedToName: null,
      };
    });
}

/**
 * Server-side paginated findings query.
 * Simulates API filtering, sorting, and pagination over the full dataset.
 */
export function getFindingsPaginated(params: {
  workspaceId: string;
  page?: number;
  perPage?: number;
  search?: string;
  severity?: string;
  verdict?: string;
  status?: string;
  sort?: string;
  order?: 'ASC' | 'DESC';
}): { data: MockFindingExtended[]; meta: { total: number; page: number; perPage: number; lastPage: number } } {
  let rows = getFindingsExtendedByWorkspace(params.workspaceId);

  // Filter by severity
  if (params.severity) {
    rows = rows.filter((r) => r.severity === params.severity);
  }

  // Filter by verdict
  if (params.verdict) {
    rows = rows.filter((r) => r.verdict === params.verdict);
  }

  // Filter by status
  if (params.status) {
    rows = rows.filter((r) => r.status === params.status);
  }

  // Search across rule, filePath, repo, cwe
  if (params.search) {
    const q = params.search.toLowerCase();
    rows = rows.filter((r) => `${r.rule} ${r.filePath} ${r.repositoryName} ${r.projectName} ${r.cweId ?? ''}`.toLowerCase().includes(q));
  }

  // Sort
  if (params.sort) {
    const dir = params.order === 'DESC' ? -1 : 1;
    rows.sort((a, b) => {
      const aVal = a[params.sort as keyof MockFindingExtended];
      const bVal = b[params.sort as keyof MockFindingExtended];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }

  const total = rows.length;
  const page = params.page ?? 1;
  const perPage = params.perPage ?? 10;
  const lastPage = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const data = rows.slice(start, start + perPage);

  return { data, meta: { total, page, perPage, lastPage } };
}

// ─── P1: Report Helpers ─────────────────────────────────────────

/** Get reports for a workspace. @example `getReportsByWorkspace('ws_01').length → 2` */
export function getReportsByWorkspace(workspaceId: string): MockReport[] {
  return reports.filter((r) => r.workspaceId === workspaceId);
}

// ─── P2: Quality Gate Helpers ───────────────────────────────────

/** Get quality gates for a workspace. */
export function getQualityGatesByWorkspace(workspaceId: string): MockQualityGate[] {
  return qualityGates.filter((qg) => qg.workspaceId === workspaceId);
}

// ─── P2: AI Model Helpers ──────────────────────────────────────

/** Get AI models for a workspace. */
export function getAiModelsByWorkspace(workspaceId: string): MockAiModel[] {
  return aiModels.filter((m) => m.workspaceId === workspaceId);
}

// ─── P2: Webhook Helpers ───────────────────────────────────────

/** Get webhooks for a workspace. */
export function getWebhooksByWorkspace(workspaceId: string): MockWebhook[] {
  return webhooks.filter((wh) => wh.workspaceId === workspaceId);
}

// ─── P2: Knowledge Base Helpers ─────────────────────────────────

/** Get knowledge sources for a workspace. */
export function getKnowledgeSourcesByWorkspace(workspaceId: string): MockKnowledgeSource[] {
  return knowledgeSources.filter((ks) => ks.workspaceId === workspaceId);
}

/** Get knowledge entries for a source. */
export function getKnowledgeEntriesBySource(sourceId: string): MockKnowledgeEntry[] {
  return knowledgeEntries.filter((ke) => ke.sourceId === sourceId);
}

/** Total entries across all sources in a workspace. */
export function getKnowledgeEntryCount(workspaceId: string): number {
  return knowledgeSources
    .filter((ks) => ks.workspaceId === workspaceId)
    .reduce((sum, ks) => sum + ks.entryCount, 0);
}

// ─── P2: Schedule Helpers ──────────────────────────────────────

/** Get schedules for repos in a workspace. */
export function getSchedulesByWorkspace(workspaceId: string): MockSchedule[] {
  const projectIds = projects.filter((p) => p.workspaceId === workspaceId).map((p) => p.id);
  const repoIds = repositories.filter((r) => projectIds.includes(r.projectId)).map((r) => r.id);
  return schedules.filter((s) => repoIds.includes(s.repositoryId));
}

// ─── P2: Profile Helpers ───────────────────────────────────────

/** Get user profile. */
export function getProfile(userId: string): MockProfile | undefined {
  const user = users.find((u) => u.id === userId);
  if (!user) return undefined;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    username: null,
    bio: null,
    timezone: 'Asia/Jakarta',
    language: 'en',
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
  };
}

// ─── P3: Environment Helpers ───────────────────────────────────

/** Get environments for a project. */
export function getEnvironmentsByProject(projectId: string): MockEnvironment[] {
  return environments.filter((e) => e.projectId === projectId);
}

// ─── P3: Project API Token Helpers ─────────────────────────────

/** Get API tokens for a project. */
export function getProjectApiTokens(projectId: string): MockProjectApiToken[] {
  return projectApiTokens.filter((t) => t.projectId === projectId);
}

/** Mutable reference to project API tokens (for mock create/revoke). */
export { projectApiTokens };

// ─── P3: AI Verification Helpers ───────────────────────────────

/** Get AI verification for a finding. */
export function getAiVerificationByFinding(findingId: string): MockAiVerification | undefined {
  return aiVerifications.find((av) => av.findingId === findingId);
}

// ─── P3: Comment Helpers ───────────────────────────────────────

/** Get comments for a finding. */
export function getCommentsByFinding(findingId: string): MockComment[] {
  return comments.filter((c) => c.findingId === findingId);
}

// ─── P3: Finding History Helpers ───────────────────────────────

/** Get history entries for a finding. */
export function getFindingHistory(findingId: string): MockFindingHistory[] {
  return findingHistory.filter((fh) => fh.findingId === findingId);
}

// ─── P3: Audit Log Helpers ─────────────────────────────────────

/** Get audit logs for a workspace. */
export function getAuditLogsByWorkspace(workspaceId: string): MockAuditLog[] {
  return auditLogs.filter((al) => al.workspaceId === workspaceId);
}

// ─── P3: Activity Log Helpers ──────────────────────────────────

/** Get activity logs for a workspace. */
export function getActivityLogsByWorkspace(workspaceId: string): MockActivityLog[] {
  return activityLogs.filter((acl) => acl.workspaceId === workspaceId);
}

// ─── P3: Notification Helpers ───────────────────────────────────

/** Get notifications for a user. */
export function getNotificationsByUser(userId: string): MockNotification[] {
  return notifications.filter((n) => n.userId === userId);
}

/** Count unread notifications. */
export function getUnreadNotificationCount(userId: string): number {
  return notifications.filter((n) => n.userId === userId && !n.readAt).length;
}

// ─── P3: Workspace Settings Helpers ────────────────────────────

/** Get all settings for a workspace. */
export function getWorkspaceSettingsByWorkspace(workspaceId: string): MockWorkspaceSetting[] {
  return workspaceSettings.filter((ws) => ws.workspaceId === workspaceId);
}

/** Get a single setting value. */
export function getWorkspaceSetting(workspaceId: string, key: string): string | null {
  return workspaceSettings.find((ws) => ws.workspaceId === workspaceId && ws.key === key)?.value ?? null;
}

// ─── P3: Storage File Helpers ───────────────────────────────────

/** Get storage files for a workspace. */
export function getStorageFilesByWorkspace(workspaceId: string): MockStorageFile[] {
  return storageFiles.filter((sf) => sf.workspaceId === workspaceId);
}

// ─── P3: Knowledge Backfill Job Helpers ─────────────────────────

/** Get backfill jobs for a knowledge source. */
export function getBackfillJobsBySource(sourceId: string): MockKnowledgeBackfillJob[] {
  return knowledgeBackfillJobs.filter((kbj) => kbj.sourceId === sourceId);
}

// ─── P3: Coverage Summary ──────────────────────────────────────

/** Total mock tables covered. @example `getCoverageCount() → 37` */
export function getCoverageCount(): number {
  return 37;
}

// ─── Scan Detail Helpers ──────────────────────────────────────────

/** Get rich scan detail for drawer (scannerResults, timeline, severityBreakdown, aiStats). */
export function getScanDetail(scanId: string) {
  return scanDetails[scanId] ?? null;
}

/** Get scan-specific findings with AI analysis for FindingItem component. */
export function getScanFindings(scanId: string) {
  return scanFindings.filter((f) => f.scanId === scanId);
}

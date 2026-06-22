/**
 * SCM API Service Interface
 *
 * Provider-agnostic interface for interacting with source control platforms.
 * Implemented by GiteaScmService, GitHubScmService, GitLabScmService.
 *
 * Used by CI/CD endpoints to:
 * - Post/update PR comments with scan results
 * - Set commit statuses for branch protection
 *
 * @module source-control/scm-api
 */

import { AppError } from '@/server/http/errors';
import { HTTP } from '@/server/http/constants';
import { GitHubScmService } from './github-api.service';
import { GitLabScmService } from './gitlab-api.service';
import { GiteaApiService } from './gitea-api.service';
import type { ScmProvider, ScmConnectionType } from '@/commons/types/domain';

// ─── Credentials ─────────────────────────────────────────────

/** Base credentials shared by all providers */
export interface ScmBaseCredentials {
  baseUrl: string;
  token: string;
  sourceControlId?: string;
}

/** OAuth credentials (shared by all providers) */
export interface ScmOAuthCredentials extends ScmBaseCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
}

/** GitHub App credentials */
export interface ScmGitHubAppCredentials extends ScmBaseCredentials {
  appId: string;
  privateKey: string;
  installationId: string;
  appSlug?: string;
}

/** Union type — provider factory accepts any of these */
export type ScmCredentials = ScmBaseCredentials | ScmOAuthCredentials | ScmGitHubAppCredentials;

/** Type guard helpers */
export function isOAuthCredentials(c: ScmCredentials): c is ScmOAuthCredentials {
  return 'clientId' in c && 'clientSecret' in c;
}

export function isGitHubAppCredentials(c: ScmCredentials): c is ScmGitHubAppCredentials {
  return 'appId' in c && 'privateKey' in c && 'installationId' in c;
}

// ─── Provider Config ─────────────────────────────────────────

/** Provider-specific configuration */
export interface ScmProviderConfig {
  provider: ScmProvider;
  connectionType: ScmConnectionType;
  /** OAuth authorize URL (null if not applicable) */
  getAuthUrl(params: { clientId: string; callbackUrl: string; state: string; baseUrl?: string }): string | null;
  /** OAuth token exchange endpoint */
  getTokenEndpoint(baseUrl: string): string;
  /** Auth header format */
  getAuthHeader(token: string): Record<string, string>;
  /** Supports automatic token refresh via refresh_token */
  supportsRefresh: boolean;
}

export interface CommitStatus {
  status: 'pending' | 'success' | 'failure' | 'error';
  description: string;
  context: string;
  targetUrl?: string;
}

export interface PrCommentFinding {
  severity: string;
  filePath: string | null;
  lineNumber: number | null;
  rule: string | null;
  message: string | null;
  scanner: string | null;
  codeSnippet: string | null;
  aiVerdict: string | null;
  confidence: string | null;
  findingId: string;
  fingerprint: string;
}

export interface InlineReviewComment {
  filePath: string;
  lineNumber: number;
  body: string;
  severity: string;
  findingId: string;
  fingerprint: string;
  scanner: string;
}

/**
 * A file changed in a PR, with the specific line numbers that were modified.
 * Used to determine if a finding is "new" (on a changed line) vs "pre-existing" (unchanged).
 */
export interface ChangedFile {
  /** File path relative to repo root (e.g. "src/main.c") */
  filePath: string;
  /** Line numbers in the NEW version of the file that were added or modified */
  changedLines: number[];
}

/**
 * Provider-agnostic SCM API service interface.
 * Each provider (Gitea, GitHub, GitLab) implements this interface.
 */
export interface ScmApiService {
  postOrUpdatePrComment(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    body: string,
  ): Promise<'created' | 'updated'>;

  findPrComment(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
  ): Promise<number | null>;

  createCommitStatus(
    owner: string,
    repo: string,
    sha: string,
    status: CommitStatus,
  ): Promise<void>;

  postInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    comments: InlineReviewComment[],
  ): Promise<{ created: number; updated: number }>;

  /**
   * Resolve (close) inline review comments for resolved findings.
   * Comments whose fingerprint is in the input list are resolved/collapsed.
   * @returns Count of resolved and failed comments.
   */
  resolveInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    fingerprints: string[],
  ): Promise<{ resolved: number; failed: number }>;

  /**
   * List existing SAST inline review comment fingerprints on a PR.
   * Used to avoid re-posting comments for persistent findings.
   */
  listExistingInlineFingerprints(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Set<string>>;

  /**
   * Update inline review comments when verdict changes.
   * Deletes old comment and reposts with updated body.
   * @returns Count of updated and failed comments.
   */
  updateInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    comments: Array<{
      fingerprint: string;
      filePath: string;
      lineNumber: number;
      body: string;
      scanner: string;
    }>,
  ): Promise<{ updated: number; failed: number }>;

  /**
   * Get the list of files changed in a PR, with line-level diff info.
   * Used to determine which findings are "new" (on changed lines) vs "pre-existing".
   */
  getPrChangedFiles(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<ChangedFile[]>;
}

/**
 * Parse repository name into owner and repo.
 * Supports: "owner/repo" or "owner-repo" (Gitea Actions format).
 *
 * @param repoName - Repository name (e.g., "MeAdmin/vuln-app")
 * @returns Tuple of [owner, repo]
 */
export function parseRepoName(repoName: string): [string, string] {
  if (repoName.includes('/')) {
    const parts = repoName.split('/');
    return [parts[0], parts.slice(1).join('/')];
  }
  // Gitea Actions format: "owner-repo"
  const dashIndex = repoName.indexOf('-');
  if (dashIndex > 0) {
    return [repoName.substring(0, dashIndex), repoName.substring(dashIndex + 1)];
  }
  throw new AppError(`Invalid repo name format: ${repoName}`, 400, HTTP.ERROR_CODES.VALIDATION);
}

// ─── Shared Helpers ─────────────────────────────────────────────

/**
 * Build a formatted PR comment with scan results.
 * This is provider-agnostic Markdown generation.
 *
 * @param scanId - Scan UUID
 * @param gateStatus - Quality gate status
 * @param newFindings - Number of new findings
 * @param fixedFindings - Number of resolved findings
 * @param blockingFindings - Number of blocking findings
 * @param findings - Array of new finding details (with AI verdict)
 * @param appBaseUrl - Base URL for app links (e.g., http://localhost:3000)
 * @returns Formatted Markdown comment
 */
export function buildPrComment(
  scanId: string,
  gateStatus: string,
  newFindings: number,
  fixedFindings: number,
  blockingFindings: number,
  findings: PrCommentFinding[],
  appBaseUrl: string = 'http://localhost:3000',
  persistentFindings: number = 0,
  workspaceSlug: string = 'workspace',
  dismissedFindings: number = 0,
  resolvedFindings: number = 0,
): string {
  // Gate status icon
  const gateIcon = gateStatus === 'passed' ? '✅' : gateStatus === 'failed' ? '❌' : '⚠️';
  const gateLabel = gateStatus.toUpperCase();

  // Count by severity
  const critical = findings.filter((f) => f.severity === 'critical');
  const high = findings.filter((f) => f.severity === 'high');
  const medium = findings.filter((f) => f.severity === 'medium');
  const low = findings.filter((f) => f.severity === 'low');

  // Count AI verification status
  const verified = findings.filter((f) => f.aiVerdict === 'true_positive').length;
  const falsePos = findings.filter((f) => f.aiVerdict === 'false_positive').length;
  const pending = findings.filter((f) => !f.aiVerdict || f.aiVerdict === 'pending').length;

  let comment = `## 🔒 SAST Security Analysis\n\n`;
  comment += `### Quality Gate: ${gateIcon} ${gateLabel}\n\n`;
  comment += `| Severity | Count | Status |\n`;
  comment += `|----------|-------|--------|\n`;
  comment += `| 🔴 Critical | ${critical.length} | ${critical.length > 0 ? '❌ Blocking' : '✅ Pass'} |\n`;
  comment += `| 🟠 High | ${high.length} | ${high.length > 0 ? '❌ Blocking' : '✅ Pass'} |\n`;
  comment += `| 🟡 Medium | ${medium.length} | ${medium.length > 0 ? '⚠️ Warning' : '✅ Pass'} |\n`;
  comment += `| ⚪ Low | ${low.length} | ✅ Pass |\n`;
  comment += `\n| Summary | Count |\n`;
  comment += `|---------|-------|\n`;
  comment += `| 📦 Total | ${newFindings + persistentFindings} |\n`;
  comment += `| 🆕 New | ${newFindings} |\n`;
  comment += `| 📂 Pre-existing | ${persistentFindings} |\n`;
  comment += `| 📌 Fixed | ${fixedFindings} |\n`;
  comment += `| 🙈 Dismissed | ${dismissedFindings} |\n`;
  comment += `| ✅ Resolved (FP) | ${resolvedFindings} |\n`;
  comment += `\n| 🤖 AI Verification | Count |\n`;
  comment += `|--------------------|-------|\n`;
  comment += `| ✅ Verified TP | ${verified} |\n`;
  comment += `| ❌ Verified FP | ${falsePos} |\n`;
  comment += `| ⏳ Pending | ${pending} |\n`;

  // Actions
  comment += `\n---\n\n### 🎯 Actions\n\n`;
  comment += `- 📊 [View Full Report](${appBaseUrl}/${workspaceSlug}/findings?scanId=${scanId})\n`;
  comment += `\n---\n*🔧 Powered by SAST Integration • \`${scanId.substring(0, 8)}\` • ${new Date().toISOString().split('T')[0]}*\n`;

  return comment;
}

/**
 * Strips Docker workspace prefix from absolute file paths.
 * /workspace/Owner/repo/file.c → file.c
 */
function normalizeDisplayPath(filePath: string): string {
  const match = filePath.match(/^\/workspace\/[^/]+\/[^/]+\/(.+)$/);
  return match ? match[1] : filePath;
}

/**
 * Build inline review comment body for a specific finding.
 * This appears as a comment on the specific line in the PR diff.
 * Uses emojis and structured format for quick scanning.
 */
export function buildInlineReviewComment(
  finding: PrCommentFinding,
  appBaseUrl: string = 'http://localhost:3000',
  workspaceSlug: string = 'workspace',
): string {
  const link = `${appBaseUrl}/${workspaceSlug}/findings/${finding.findingId}`;
  const displayPath = normalizeDisplayPath(finding.filePath || '');

  const sevEmoji: Record<string, string> = {
    critical: '🔴',
    high: '🟠',
    medium: '🟡',
    low: '⚪',
  };
  const sevEmojiIcon = sevEmoji[finding.severity] ?? '⚪';

  const verdictEmoji: Record<string, string> = {
    true_positive: '✅',
    TP: '✅',
    false_positive: '❌',
    FP: '❌',
    pending: '⏳',
    Pending: '⏳',
  };
  const verdictLabel: Record<string, string> = {
    true_positive: 'True Positive',
    TP: 'True Positive',
    false_positive: 'False Positive',
    FP: 'False Positive',
    pending: 'Pending',
    Pending: 'Pending',
  };
  const vEmoji = verdictEmoji[finding.aiVerdict ?? ''] ?? '⏳';
  const vLabel = verdictLabel[finding.aiVerdict ?? ''] ?? 'Pending verification';

  let comment = `<!-- sast-integration:inline-review:${finding.fingerprint} -->\n`;
  comment += `${sevEmojiIcon} **${finding.severity.toUpperCase()}** · \`${finding.scanner}\`\n\n`;
  comment += `**📋 ${finding.rule || 'Unknown rule'}**\n\n`;
  comment += `> ${(finding.message || 'No description').split('\n')[0]}\n\n`;

  if (finding.codeSnippet) {
    const snippet = finding.codeSnippet.split('\n').slice(0, 3).join('\n');
    comment += `**🔍 Code:**\n`;
    comment += `\`\`\`${displayPath.split('.').pop() || ''}\n${snippet}\n\`\`\`\n\n`;
  }

  comment += `| AI Review | Confidence |\n`;
  comment += `|-----------|------------|\n`;
  comment += `| ${vEmoji} ${vLabel} | ${finding.confidence ?? '—'} |\n\n`;

  comment += `👉 [View full finding](${link})`;

  return comment;
}

/**
 * Extract fingerprint from an inline review comment body marker.
 * Marker format: <!-- sast-integration:inline-review:{fingerprint} -->
 * Returns null if marker not found.
 */
export function extractFingerprintFromMarker(body: string): string | null {
  const match = body.match(/<!--\s*sast-integration:inline-review:([a-f0-9-]+)\s*-->/);
  return match?.[1] ?? null;
}

/**
 * Parse a unified diff patch string to extract changed line numbers in the NEW file.
 * Handles multi-hunk patches.
 *
 * @example
 * parsePatchToChangedLines("@@ -10,6 +10,8 @@\n context\n+added\n-removed\n") // [11, 12]
 */
export function parsePatchToChangedLines(patch: string): number[] {
  const lines = patch.split('\n');
  const changedLines: number[] = [];
  let currentNewLine = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunkMatch) {
      currentNewLine = parseInt(hunkMatch[1], 10);
      continue;
    }

    // Skip file header
    if (line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('---') || line.startsWith('+++')) {
      continue;
    }

    // Context line (no change)
    if (line.startsWith(' ')) {
      currentNewLine++;
      continue;
    }

    // Added line (new file line)
    if (line.startsWith('+')) {
      changedLines.push(currentNewLine);
      currentNewLine++;
      continue;
    }

    // Removed line (old file only, doesn't increment new line counter)
    if (line.startsWith('-')) {
      continue;
    }

    // Unknown line type — skip
  }

  return changedLines;
}

// ─── Provider Configs ────────────────────────────────────────

const GITHUB_OAUTH_CONFIG: ScmProviderConfig = {
  provider: 'github',
  connectionType: 'oauth',
  getAuthUrl({ clientId, callbackUrl, state }) {
    const url = new URL('https://github.com/login/oauth/authorize');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('scope', 'repo read:org');
    url.searchParams.set('state', state);
    return url.toString();
  },
  getTokenEndpoint(baseUrl) {
    return `${baseUrl}/login/oauth/access_token`;
  },
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
  },
  supportsRefresh: false,
};

const GITHUB_PAT_CONFIG: ScmProviderConfig = {
  provider: 'github',
  connectionType: 'pat',
  getAuthUrl: () => null,
  getTokenEndpoint: () => '',
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' };
  },
  supportsRefresh: false,
};

const GITHUB_APP_CONFIG: ScmProviderConfig = {
  provider: 'github',
  connectionType: 'github-app',
  getAuthUrl({ clientId, state }) {
    // GitHub App uses installation URL, not OAuth. clientId = appSlug here.
    return `https://github.com/apps/${encodeURIComponent(clientId)}/installations/new?state=${encodeURIComponent(state)}`;
  },
  getTokenEndpoint: () => '',
  getAuthHeader(token) {
    return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  },
  supportsRefresh: false,
};

const GITLAB_OAUTH_CONFIG: ScmProviderConfig = {
  provider: 'gitlab',
  connectionType: 'oauth',
  getAuthUrl({ clientId, callbackUrl, state, baseUrl }) {
    const url = new URL('/oauth/authorize', baseUrl || 'https://gitlab.com');
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'read_api read_repository');
    url.searchParams.set('state', state);
    return url.toString();
  },
  getTokenEndpoint(baseUrl) {
    return `${baseUrl}/oauth/token`;
  },
  getAuthHeader(token) {
    return { 'PRIVATE-TOKEN': token };
  },
  supportsRefresh: true,
};

const GITLAB_PAT_CONFIG: ScmProviderConfig = {
  provider: 'gitlab',
  connectionType: 'pat',
  getAuthUrl: () => null,
  getTokenEndpoint: () => '',
  getAuthHeader(token) {
    return { 'PRIVATE-TOKEN': token };
  },
  supportsRefresh: false,
};

const GITEA_OAUTH_CONFIG: ScmProviderConfig = {
  provider: 'gitea',
  connectionType: 'oauth',
  getAuthUrl({ clientId, callbackUrl, state, baseUrl }) {
    if (!baseUrl) return null;
    const url = new URL('/login/oauth/authorize', baseUrl);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', callbackUrl);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', state);
    return url.toString();
  },
  getTokenEndpoint(baseUrl) {
    return `${baseUrl}/login/oauth/access_token`;
  },
  getAuthHeader(token) {
    return { Authorization: `token ${token}` };
  },
  supportsRefresh: true,
};

const GITEA_PAT_CONFIG: ScmProviderConfig = {
  provider: 'gitea',
  connectionType: 'pat',
  getAuthUrl: () => null,
  getTokenEndpoint: () => '',
  getAuthHeader(token) {
    return { Authorization: `token ${token}` };
  },
  supportsRefresh: false,
};

/** All provider configs indexed by provider+connectionType */
const PROVIDER_CONFIGS: Record<string, ScmProviderConfig> = {
  'github:oauth': GITHUB_OAUTH_CONFIG,
  'github:pat': GITHUB_PAT_CONFIG,
  'github:github-app': GITHUB_APP_CONFIG,
  'gitlab:oauth': GITLAB_OAUTH_CONFIG,
  'gitlab:pat': GITLAB_PAT_CONFIG,
  'gitea:oauth': GITEA_OAUTH_CONFIG,
  'gitea:pat': GITEA_PAT_CONFIG,
};

// ─── Token Refresh ───────────────────────────────────────────

export interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

/**
 * Refresh OAuth token for a provider.
 * Gitea and GitLab support refresh_token flow.
 * GitHub PATs don't support refresh.
 */
export async function refreshOAuthToken(
  provider: ScmProvider,
  credentials: ScmOAuthCredentials,
): Promise<RefreshedTokens | null> {
  if (provider === 'gitea') {
    return refreshGiteaOAuthToken(
      credentials.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || '',
    );
  }
  if (provider === 'gitlab') {
    return refreshGitLabOAuthToken(
      credentials.baseUrl,
      credentials.clientId,
      credentials.clientSecret,
      credentials.refreshToken || '',
    );
  }
  // GitHub PATs don't support refresh
  return null;
}

/**
 * Refresh Gitea OAuth token using refresh_token.
 * Shared between GiteaApiService and source-control.service.ts.
 */
export async function refreshGiteaOAuthToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  if (!clientId || !clientSecret || !refreshToken || !baseUrl) return null;

  try {
    const payload = await fetch(`${baseUrl}/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }).then((r) => r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };

    if (payload.access_token) {
      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token || refreshToken,
        expiresIn: payload.expires_in || undefined,
      };
    }
  } catch {
    // Refresh failed
  }
  return null;
}

/**
 * Refresh GitLab OAuth token using refresh_token.
 * GitLab uses /oauth/token endpoint with grant_type=refresh_token.
 */
export async function refreshGitLabOAuthToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<RefreshedTokens | null> {
  if (!clientId || !clientSecret || !refreshToken || !baseUrl) return null;

  try {
    const tokenEndpoint = `${baseUrl.replace(/\/+$/, '')}/oauth/token`;
    const payload = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    }).then((r) => r.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };

    if (payload.access_token) {
      return {
        accessToken: payload.access_token,
        refreshToken: payload.refresh_token || refreshToken,
        expiresIn: payload.expires_in || undefined,
      };
    }
  } catch {
    // Refresh failed
  }
  return null;
}

// ─── Factory ─────────────────────────────────────────────────

/**
 * Get provider config by provider and connection type.
 */
export function getScmProviderConfig(provider: ScmProvider, connectionType: ScmConnectionType): ScmProviderConfig {
  const key = `${provider}:${connectionType}`;
  const config = PROVIDER_CONFIGS[key];
  if (!config) {
    throw new AppError(`Unsupported SCM provider/connection type: ${provider}/${connectionType}`, 400, HTTP.ERROR_CODES.VALIDATION);
  }
  return config;
}

/**
 * Resolve connection type from credentials.
 * If `mode` field exists, map it. Otherwise default to 'pat'.
 */
export function resolveConnectionType(credentials: Record<string, unknown>): ScmConnectionType {
  const mode = typeof credentials.mode === 'string' ? credentials.mode : '';
  if (mode === 'github-app') return 'github-app';
  if (mode === 'oauth-app') return 'oauth';
  return 'pat';
}

/**
 * Provider-specific factory function.
 * Returns the appropriate ScmApiService implementation based on provider.
 */
export function createScmApiService(provider: string, credentials: ScmCredentials): ScmApiService {
  switch (provider) {
    case 'github':
      // GitHub uses ScmBaseCredentials (only needs baseUrl + token)
      return new GitHubScmService(credentials as ScmBaseCredentials);
    case 'gitlab':
      // GitLab uses ScmOAuthCredentials (supports refresh_token flow)
      return new GitLabScmService(credentials as ScmOAuthCredentials);
    case 'gitea':
      // Gitea uses ScmOAuthCredentials (needs OAuth fields for refresh)
      return new GiteaApiService(credentials as ScmOAuthCredentials);
    default:
      throw new AppError(`Unsupported SCM provider: ${provider}`, 400, HTTP.ERROR_CODES.VALIDATION);
  }
}

/**
 * Build OAuth redirect URL for a provider.
 * Uses centralized provider configs.
 */
export function buildScmAuthUrl(
  provider: ScmProvider,
  connectionType: ScmConnectionType,
  params: { clientId: string; callbackUrl: string; state: string; baseUrl?: string },
): string | null {
  const config = getScmProviderConfig(provider, connectionType);
  return config.getAuthUrl(params);
}

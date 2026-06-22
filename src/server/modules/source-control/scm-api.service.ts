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

export interface ScmCredentials {
  baseUrl: string;
  token: string;
  clientId?: string;
  clientSecret?: string;
  refreshToken?: string;
  sourceControlId?: string;
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
   * Resolve (close) inline review comments for fixed findings.
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
 * Get severity icon emoji.
 */
export function severityIcon(severity: string): string {
  if (severity === 'critical') return '🔴';
  if (severity === 'high') return '🟠';
  if (severity === 'medium') return '🟡';
  return '⚪';
}

/**
 * Format file path and line number for display.
 */
export function formatFileLocation(filePath: string | null, lineNumber: number | null): string {
  if (!filePath) return 'N/A';
  if (lineNumber) return `${filePath}:${lineNumber}`;
  return filePath;
}

/**
 * Detect code language from file path.
 */
export function codeLanguage(filePath: string | null): string {
  if (!filePath) return 'text';
  if (filePath.match(/\.(c|h|cpp|hpp)$/)) return 'c';
  if (filePath.match(/\.(js|jsx)$/)) return 'javascript';
  if (filePath.match(/\.(ts|tsx)$/)) return 'typescript';
  if (filePath.match(/\.py$/)) return 'python';
  return 'text';
}

/**
 * Build a formatted PR comment with scan results.
 * This is provider-agnostic Markdown generation.
 *
 * @param scanId - Scan UUID
 * @param gateStatus - Quality gate status
 * @param newFindings - Number of new findings
 * @param fixedFindings - Number of fixed findings
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
  comment += `\n| Summary | Unique Issues |\n`;
  comment += `|---------|---------------|\n`;
  comment += `| Total | ${newFindings + persistentFindings} |\n`;
  comment += `| New | ${newFindings} |\n`;
  comment += `| Fixed | ${fixedFindings} |\n`;
  comment += `| Pre-existing | ${persistentFindings} |\n`;
  comment += `\n| AI Verification | Count |\n`;
  comment += `|-----------------|-------|\n`;
  comment += `| ✅ Verified TP | ${verified} |\n`;
  comment += `| ❌ Verified FP | ${falsePos} |\n`;
  comment += `| ⏳ Pending | ${pending} |\n`;

  // Actions
  comment += `\n---\n\n### 🎯 Actions\n\n`;
  comment += `- [📊 View Full Report](${appBaseUrl}/${workspaceSlug}/findings?scanId=${scanId})\n`;
  comment += `\n---\n*Powered by SAST Integration • Scan: \`${scanId.substring(0, 8)}\` • ${new Date().toISOString().split('T')[0]}*\n`;

  return comment;
}

/**
 * Build a single finding block with code snippet and AI verdict.
 */
function buildFindingBlock(f: PrCommentFinding, appBaseUrl: string): string {
  const sevIcon = severityIcon(f.severity);
  const displayPath = normalizeDisplayPath(f.filePath || '');
  const file = formatFileLocation(displayPath, f.lineNumber);
  const aiBadge = getAiBadge(f.aiVerdict, f.confidence);
  const link = `${appBaseUrl}/workspace/finding/${f.findingId}`;

  let block = `**\`${file}\` — ${sevIcon} ${f.severity.toUpperCase()} — ${f.rule || 'N/A'}**\n\n`;
  block += `| | |\n|---|---|\n`;
  block += `| Scanner | ${f.scanner || 'N/A'} |\n`;
  block += `| AI Verdict | ${aiBadge} |\n`;
  block += `| Message | ${f.message || 'No description'} |\n`;

  if (f.codeSnippet) {
    // Limit code snippet to 8 lines and detect language
    const lines = f.codeSnippet.split('\n').slice(0, 8);
    const lang = codeLanguage(f.filePath);
    block += `| Code | \`\`\`${lang}\n${lines.join('\n')}\n\`\`\` |\n`;
  }

  block += `| Action | [✅ TP](${link}?action=tp) [❌ FP](${link}?action=fp) [📝 Review](${link}) |\n\n`;
  return block;
}

/**
 * Get AI verdict badge with confidence.
 */
function getAiBadge(verdict: string | null, confidence: string | null): string {
  if (!verdict || verdict === 'pending') return '⏳ Pending';
  const parsed = confidence ? parseFloat(confidence) : NaN;
  const conf = !isNaN(parsed) ? ` (${Math.round(parsed > 1 ? parsed : parsed * 100)}%)` : '';
  if (verdict === 'true_positive') return `✅ TP${conf}`;
  if (verdict === 'false_positive') return `❌ FP${conf}`;
  return '⏳ Pending';
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
 */
export function buildInlineReviewComment(
  finding: PrCommentFinding,
  appBaseUrl: string = 'http://localhost:3000',
  workspaceSlug: string = 'workspace',
): string {
  const link = `${appBaseUrl}/${workspaceSlug}/findings/${finding.findingId}`;
  const sevLabel = finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1);
  const displayPath = normalizeDisplayPath(finding.filePath || '');

  let comment = `SAST Integration detected a ${sevLabel} issue at ${displayPath}:${finding.lineNumber}.\n\n`;
  comment += `**Issue:** ${finding.message || 'No description'}\n`;
  comment += `**Rule:** ${finding.rule || 'N/A'}\n`;
  comment += `**Scanner:** ${finding.scanner || 'N/A'}\n`;

  if (finding.aiVerdict) {
    comment += `**AI review:** ${finding.aiVerdict}${finding.confidence ? ` (${finding.confidence})` : ''}\n`;
  } else {
    comment += `**AI review:** Pending verification\n`;
  }

  comment += `\n**Action:** [📝 Review](${link})`;

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
 * Provider-specific factory function.
 * Returns the appropriate ScmApiService implementation based on provider.
 */
export function createScmApiService(provider: string, credentials: ScmCredentials): ScmApiService {
  switch (provider) {
    case 'github':
      return new GitHubScmService(credentials);
    case 'gitlab':
      return new GitLabScmService(credentials);
    case 'gitea':
      return new GiteaApiService(credentials);
    default:
      throw new AppError(`Unsupported SCM provider: ${provider}`, 400, HTTP.ERROR_CODES.VALIDATION);
  }
}

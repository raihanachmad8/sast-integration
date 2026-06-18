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

export interface ScmCredentials {
  baseUrl: string;
  token: string;
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
  throw new Error(`Invalid repo name format: ${repoName}`);
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
  if (filePath.match(/\.(js|ts|jsx|tsx)$/)) return 'javascript';
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
  comment += `| Metric | Value | Status |\n`;
  comment += `|--------|-------|--------|\n`;
  comment += `| 🔴 Critical | ${critical.length} | ${critical.length > 0 ? '❌ Blocking' : '✅ Pass'} |\n`;
  comment += `| 🟠 High | ${high.length} | ${high.length > 0 ? '❌ Blocking' : '✅ Pass'} |\n`;
  comment += `| 🟡 Medium | ${medium.length} | ${medium.length > 0 ? '⚠️ Warning' : '✅ Pass'} |\n`;
  comment += `| ⚪ Low | ${low.length} | ✅ Pass |\n`;
  comment += `| **Total New** | **${newFindings}** | |\n`;
  comment += `| ✅ Fixed | ${fixedFindings} | |\n`;
  comment += `| 🤖 Verified (TP) | ${verified} | |\n`;
  comment += `| ❌ False Positive | ${falsePos} | |\n`;
  comment += `| ⏳ Pending AI | ${pending} | |\n`;

  // Critical findings with code snippet
  if (critical.length > 0) {
    comment += `\n---\n\n### 🔴 Critical Findings (${critical.length})\n\n`;
    for (const f of critical) {
      comment += buildFindingBlock(f, appBaseUrl);
    }
  }

  // High findings with expandable
  if (high.length > 0) {
    comment += `\n---\n\n<details>\n<summary>🟠 High Findings (${high.length}) — Click to expand</summary>\n\n`;
    for (const f of high) {
      comment += buildFindingBlock(f, appBaseUrl);
    }
    comment += `</details>\n`;
  }

  // Medium findings in table
  if (medium.length > 0) {
    comment += `\n---\n\n<details>\n<summary>🟡 Medium Findings (${medium.length}) — Click to expand</summary>\n\n`;
    comment += `| File | Rule | Scanner | AI | Action |\n`;
    comment += `|------|------|---------|-----|--------|\n`;
    for (const f of medium) {
      const file = f.filePath ? `\`${f.filePath}:${f.lineNumber ?? ''}\`` : 'N/A';
      const aiBadge = getAiBadge(f.aiVerdict, f.confidence);
      const link = `${appBaseUrl}/workspace/finding/${f.findingId}`;
      comment += `| ${file} | ${f.rule || 'N/A'} | ${f.scanner || 'N/A'} | ${aiBadge} | [📝](${link}) |\n`;
    }
    comment += `\n</details>\n`;
  }

  // Low findings in table
  if (low.length > 0) {
    comment += `\n<details>\n<summary>⚪ Low Findings (${low.length}) — Click to expand</summary>\n\n`;
    comment += `| File | Rule | Scanner | AI | Action |\n`;
    comment += `|------|------|---------|-----|--------|\n`;
    for (const f of low) {
      const file = f.filePath ? `\`${f.filePath}:${f.lineNumber ?? ''}\`` : 'N/A';
      const aiBadge = getAiBadge(f.aiVerdict, f.confidence);
      const link = `${appBaseUrl}/workspace/finding/${f.findingId}`;
      comment += `| ${file} | ${f.rule || 'N/A'} | ${f.scanner || 'N/A'} | ${aiBadge} | [📝](${link}) |\n`;
    }
    comment += `\n</details>\n`;
  }

  // Scanner breakdown
  const scannerCounts = new Map<string, number>();
  for (const f of findings) {
    const s = f.scanner || 'unknown';
    scannerCounts.set(s, (scannerCounts.get(s) || 0) + 1);
  }
  if (scannerCounts.size > 0) {
    comment += `\n---\n\n### 📊 Scanner Breakdown\n\n`;
    comment += `| Scanner | Findings |\n`;
    comment += `|---------|----------|\n`;
    for (const [scanner, count] of scannerCounts) {
      comment += `| ${scanner} | ${count} |\n`;
    }
    comment += `| **Total** | **${newFindings}** |\n`;
  }

  // Actions
  comment += `\n---\n\n### 🎯 Actions\n\n`;
  comment += `- [📊 View Full Report](${appBaseUrl}/workspace/scan/${scanId})\n`;
  comment += `- [🔄 Re-scan this PR](${appBaseUrl}/workspace/scan/new?pr=${scanId})\n`;
  comment += `\n---\n*Powered by SAST Integration • Scan: \`${scanId.substring(0, 8)}\` • ${new Date().toISOString().split('T')[0]}*\n`;

  return comment;
}

/**
 * Build a single finding block with code snippet and AI verdict.
 */
function buildFindingBlock(f: PrCommentFinding, appBaseUrl: string): string {
  const sevIcon = severityIcon(f.severity);
  const file = formatFileLocation(f.filePath, f.lineNumber);
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
  const conf = confidence ? ` (${Math.round(parseFloat(confidence) * 100)}%)` : '';
  if (verdict === 'true_positive') return `✅ TP${conf}`;
  if (verdict === 'false_positive') return `❌ FP${conf}`;
  return '⏳ Pending';
}

/**
 * Provider-specific factory function.
 * Returns the appropriate ScmApiService implementation based on provider.
 */
export function createScmApiService(provider: string, credentials: ScmCredentials): ScmApiService {
  switch (provider) {
    case 'github': {
      const { GitHubScmService } = require('./github-api.service');
      return new GitHubScmService(credentials);
    }
    case 'gitlab': {
      const { GitLabScmService } = require('./gitlab-api.service');
      return new GitLabScmService(credentials);
    }
    case 'gitea':
    default: {
      const { GiteaApiService } = require('./gitea-api.service');
      return new GiteaApiService(credentials);
    }
  }
}

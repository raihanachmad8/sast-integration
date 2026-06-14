/**
 * Gitea API Service
 *
 * Provides methods to interact with Gitea API for PR comments and commit statuses.
 * Used by CI/CD endpoints to post scan results back to Gitea.
 *
 * @module source-control/gitea-api
 */

import { logger } from '@/server/lib/logger';

export interface GiteaCredentials {
  baseUrl: string;
  token: string;
}

export interface CommitStatus {
  status: 'pending' | 'success' | 'failure' | 'error';
  description: string;
  context: string;
  targetUrl?: string;
}

export interface PullRequestComment {
  body: string;
}

/**
 * Gitea API client for PR comments and commit statuses.
 *
 * @example
 * ```ts
 * const gitea = new GiteaApiService({ baseUrl: 'http://gitea:4000', token: 'xxx' });
 * await gitea.postPrComment('owner', 'repo', 123, '## SAST Report\n...');
 * await gitea.createCommitStatus('owner', 'repo', 'sha123', { status: 'success', description: 'Passed', context: 'sast/gate' });
 * ```
 */
export class GiteaApiService {
  private baseUrl: string;
  private token: string;

  constructor(credentials: GiteaCredentials) {
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
  }

  /**
   * Post a comment on a pull request (issue).
   * Gitea treats PRs as issues, so we use the issues API.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param prNumber - PR/issue number
   * @param body - Comment body (Markdown)
   */
  async postPrComment(owner: string, repo: string, prNumber: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/issues/${prNumber}/comments`;

    logger.scan.info('Gitea: posting PR comment', { owner, repo, prNumber, bodyLength: body.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.token}`,
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('Gitea: PR comment failed', { status: response.status, error: errorText });
      throw new Error(`Gitea PR comment failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('Gitea: PR comment posted', { owner, repo, prNumber });
  }

  /**
   * Create or update a commit status.
   *
   * @param owner - Repository owner
   * @param repo - Repository name
   * @param sha - Commit SHA
   * @param status - Status to set
   */
  async createCommitStatus(owner: string, repo: string, sha: string, status: CommitStatus): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/statuses/${sha}`;

    logger.scan.info('Gitea: creating commit status', { owner, repo, sha, status: status.status, context: status.context });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.token}`,
      },
      body: JSON.stringify({
        state: status.status,
        description: status.description,
        context: status.context,
        target_url: status.targetUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('Gitea: commit status failed', { status: response.status, error: errorText });
      throw new Error(`Gitea commit status failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('Gitea: commit status created', { owner, repo, sha, status: status.status });
  }

  /**
   * Parse a repository name into owner and repo.
   * Supports formats: "owner/repo" or "owner-repo" (Gitea Actions format).
   *
   * @param repoName - Repository name (e.g., "MeAdmin/vuln-app")
   * @returns Tuple of [owner, repo]
   */
  static parseRepoName(repoName: string): [string, string] {
    if (repoName.includes('/')) {
      const [owner, repo] = repoName.split('/');
      return [owner, repo];
    }
    // Gitea Actions format: "owner-repo"
    const dashIndex = repoName.indexOf('-');
    if (dashIndex > 0) {
      return [repoName.substring(0, dashIndex), repoName.substring(dashIndex + 1)];
    }
    throw new Error(`Invalid repo name format: ${repoName}`);
  }

  /**
   * Build a formatted PR comment with scan results.
   *
   * @param scanId - Scan UUID
   * @param gateStatus - Quality gate status
   * @param newFindings - Number of new findings
   * @param fixedFindings - Number of fixed findings
   * @param blockingFindings - Number of blocking findings
   * @param findings - Array of new finding details
   * @returns Formatted Markdown comment
   */
  static buildPrComment(
    scanId: string,
    gateStatus: string,
    newFindings: number,
    fixedFindings: number,
    blockingFindings: number,
    findings: Array<{
      severity: string;
      filePath: string | null;
      lineNumber: number | null;
      rule: string | null;
      message: string | null;
      scanner: string | null;
    }>,
  ): string {
    const gateIcon = gateStatus === 'passed' ? '✅' : gateStatus === 'failed' ? '❌' : '⚠️';
    const gateLabel = gateStatus.toUpperCase();

    let comment = `## 🔒 SAST Security Analysis\n\n`;
    comment += `### Quality Gate: ${gateIcon} ${gateLabel}\n\n`;
    comment += `| Metric | Value |\n`;
    comment += `|--------|-------|\n`;
    comment += `| New findings | ${newFindings} |\n`;
    comment += `| Fixed findings | ${fixedFindings} |\n`;
    comment += `| Blocking (Critical/High) | ${blockingFindings} |\n`;

    if (findings.length > 0) {
      comment += `\n### New Findings\n\n`;
      comment += `| Severity | File | Rule | Message |\n`;
      comment += `|----------|------|------|---------|\n`;

      for (const f of findings.slice(0, 10)) {
        const sevIcon = f.severity === 'critical' ? '🔴' : f.severity === 'high' ? '🟠' : f.severity === 'medium' ? '🟡' : '⚪';
        const file = f.filePath ? `${f.filePath}${f.lineNumber ? `:${f.lineNumber}` : ''}` : 'N/A';
        const rule = f.rule || 'N/A';
        const message = (f.message || 'N/A').slice(0, 80);
        comment += `| ${sevIcon} ${f.severity} | \`${file}\` | ${rule} | ${message} |\n`;
      }

      if (findings.length > 10) {
        comment += `\n*...and ${findings.length - 10} more findings*\n`;
      }
    }

    comment += `\n---\n*Powered by SAST Integration • Scan: ${scanId.substring(0, 8)}*`;

    return comment;
  }
}

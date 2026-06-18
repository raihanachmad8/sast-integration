/**
 * GitHub API Service
 *
 * Implements ScmApiService for GitHub.
 * Uses GitHub REST API v3 for PR comments and commit statuses.
 *
 * @module source-control/github-api
 */

import { logger } from '@/server/lib/logger';
import type { ScmApiService, ScmCredentials, CommitStatus } from './scm-api.service';

/**
 * GitHub implementation of ScmApiService.
 *
 * @example
 * ```ts
 * const github = new GitHubScmService({ baseUrl: 'https://api.github.com', token: 'ghp_xxx' });
 * await github.postOrUpdatePrComment('owner', 'repo', 123, 'scan-id', '## SAST Report\n...');
 * await github.createCommitStatus('owner', 'repo', 'sha123', { status: 'success', description: 'Passed', context: 'sast/gate' });
 * ```
 */
export class GitHubScmService implements ScmApiService {
  private baseUrl: string;
  private token: string;

  constructor(credentials: ScmCredentials) {
    // GitHub API: https://api.github.com or custom Enterprise URL
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
  }

  /**
   * Post a comment on a pull request.
   * GitHub API: POST /repos/{owner}/{repo}/issues/{issue_number}/comments
   */
  async postPrComment(owner: string, repo: string, prNumber: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/comments`;

    logger.scan.info('GitHub: posting PR comment', { owner, repo, prNumber, bodyLength: body.length });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitHub: PR comment failed', { status: response.status, error: errorText });
      throw new Error(`GitHub PR comment failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('GitHub: PR comment posted', { owner, repo, prNumber });
  }

  /**
   * Find an existing PR comment by scan ID marker.
   * GitHub API: GET /repos/{owner}/{repo}/issues/{issue_number}/comments
   */
  async findPrComment(owner: string, repo: string, prNumber: number, scanId: string): Promise<number | null> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`;

    logger.scan.info('GitHub: finding PR comment', { owner, repo, prNumber, scanId });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      logger.scan.warn('GitHub: failed to list PR comments', { status: response.status });
      return null;
    }

    const comments = await response.json() as Array<{ id: number; body: string }>;
    const scanIdShort = scanId.substring(0, 8);

    for (const comment of comments) {
      if (comment.body.includes(`Scan: \`${scanIdShort}\``) || comment.body.includes(`Scan: ${scanId}`)) {
        logger.scan.info('GitHub: found existing PR comment', { commentId: comment.id, scanId });
        return comment.id;
      }
    }

    logger.scan.info('GitHub: no existing PR comment found', { scanId });
    return null;
  }

  /**
   * Update an existing PR comment.
   * GitHub API: PATCH /repos/{owner}/{repo}/issues/comments/{comment_id}
   */
  async updatePrComment(owner: string, repo: string, _prNumber: number, commentId: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/issues/comments/${commentId}`;

    logger.scan.info('GitHub: updating PR comment', { owner, repo, commentId, bodyLength: body.length });

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitHub: update PR comment failed', { status: response.status, error: errorText });
      throw new Error(`GitHub update PR comment failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('GitHub: PR comment updated', { owner, repo, commentId });
  }

  /**
   * Post or update a PR comment (dedup by scan ID).
   */
  async postOrUpdatePrComment(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    body: string,
  ): Promise<'created' | 'updated'> {
    const existingCommentId = await this.findPrComment(owner, repo, prNumber, scanId);

    if (existingCommentId) {
      await this.updatePrComment(owner, repo, prNumber, existingCommentId, body);
      return 'updated';
    }

    await this.postPrComment(owner, repo, prNumber, body);
    return 'created';
  }

  /**
   * Create a commit status.
   * GitHub API: POST /repos/{owner}/{repo}/statuses/{sha}
   */
  async createCommitStatus(owner: string, repo: string, sha: string, status: CommitStatus): Promise<void> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/statuses/${sha}`;

    logger.scan.info('GitHub: creating commit status', { owner, repo, sha, status: status.status, context: status.context });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        state: status.status === 'error' ? 'error' : status.status,
        description: status.description,
        context: status.context,
        target_url: status.targetUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitHub: commit status failed', { status: response.status, error: errorText });
      throw new Error(`GitHub commit status failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('GitHub: commit status created', { owner, repo, sha, status: status.status });
  }
}

/**
 * Gitea API Service
 *
 * Implements ScmApiService for Gitea.
 * Uses Gitea API v1 for PR comments (issues API) and commit statuses.
 *
 * @module source-control/gitea-api
 */

import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { HTTP } from '@/server/http/constants';
import type { ScmApiService, ScmCredentials, CommitStatus, InlineReviewComment } from './scm-api.service';

/**
 * Gitea implementation of ScmApiService.
 *
 * @example
 * ```ts
 * const gitea = new GiteaApiService({ baseUrl: 'http://gitea:4000', token: 'xxx' });
 * await gitea.postOrUpdatePrComment('owner', 'repo', 123, 'scan-id', '## SAST Report\n...');
 * await gitea.createCommitStatus('owner', 'repo', 'sha123', { status: 'success', description: 'Passed', context: 'sast/gate' });
 * ```
 */
export class GiteaApiService implements ScmApiService {
  private baseUrl: string;
  private token: string;

  constructor(credentials: ScmCredentials) {
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
  }

  /**
   * Post a comment on a pull request (issue).
   * Gitea treats PRs as issues, so we use the issues API.
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
      throw new AppError(`Gitea PR comment failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('Gitea: PR comment posted', { owner, repo, prNumber });
  }

  /**
   * Find an existing PR comment by scan ID marker.
   * Searches for `Scan: {scanId}` pattern in comment body.
   */
  async findPrComment(owner: string, repo: string, prNumber: number, scanId: string): Promise<number | null> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/issues/${prNumber}/comments?limit=50`;

    logger.scan.info('Gitea: finding PR comment', { owner, repo, prNumber, scanId });

    const response = await fetch(url, {
      headers: { 'Authorization': `token ${this.token}` },
    });

    if (!response.ok) {
      logger.scan.warn('Gitea: failed to list PR comments', { status: response.status });
      return null;
    }

    const comments = await response.json() as Array<{ id: number; body: string }>;
    const scanIdShort = scanId.substring(0, 8);

    for (const comment of comments) {
      if (comment.body.includes(`Scan: \`${scanIdShort}\``) || comment.body.includes(`Scan: ${scanId}`)) {
        logger.scan.info('Gitea: found existing PR comment', { commentId: comment.id, scanId });
        return comment.id;
      }
    }

    logger.scan.info('Gitea: no existing PR comment found', { scanId });
    return null;
  }

  /**
   * Update an existing PR comment.
   */
  async updatePrComment(owner: string, repo: string, prNumber: number, commentId: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/issues/comments/${commentId}`;

    logger.scan.info('Gitea: updating PR comment', { owner, repo, prNumber, commentId, bodyLength: body.length });

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `token ${this.token}`,
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('Gitea: update PR comment failed', { status: response.status, error: errorText });
      throw new AppError(`Gitea update PR comment failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('Gitea: PR comment updated', { owner, repo, prNumber, commentId });
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
   * Create or update a commit status.
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
      throw new AppError(`Gitea commit status failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('Gitea: commit status created', { owner, repo, sha, status: status.status });
  }

  /**
   * Post inline review comments on specific lines of a PR.
   * Gitea uses the pull reviews API: POST /repos/{owner}/{repo}/pulls/{index}/reviews
   */
  async postInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    comments: InlineReviewComment[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    try {
      // Gitea requires creating a review with comments
      const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
      const headSha = await this.getPrHeadSha(owner, repo, prNumber);

      logger.scan.info('Gitea: posting inline review comments', {
        owner, repo, prNumber, commentCount: comments.length,
      });

      const reviewComments = comments.map((c) => ({
        body: `<!-- sast-integration:inline-review -->\n${c.body}`,
        path: c.filePath,
        new_position: c.lineNumber,
        old_position: 0,
      }));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `token ${this.token}`,
        },
        body: JSON.stringify({
          body: `## 🔒 SAST Security Analysis\n\nFound ${comments.length} security issue(s) in this PR.\n\n---\n*Scan: \`${scanId.substring(0, 8)}\`*`,
          event: 'COMMENT',
          commit_id: headSha,
          comments: reviewComments,
        }),
      });

      if (response.ok) {
        created = comments.length;
        logger.scan.info('Gitea: inline review comments posted', {
          owner, repo, prNumber, count: created,
        });
      } else {
        const errorText = await response.text();
        logger.scan.warn('Gitea: inline review comments failed', {
          status: response.status, error: errorText,
        });
      }
    } catch (err) {
      logger.scan.warn('Gitea: inline review comments error', {
        error: (err as Error).message,
      });
    }

    return { created, updated };
  }

  /**
   * Delete inline review comments from a previous scan.
   * Gitea doesn't support deleting individual review comments easily,
   * so we just log a warning.
   */
  async deleteInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
  ): Promise<number> {
    // Gitea doesn't have a straightforward way to delete review comments
    // We'll return 0 and rely on the scan ID marker for dedup
    logger.scan.info('Gitea: inline comment deletion not supported, using dedup', { owner, repo, prNumber, scanId });
    return 0;
  }

  /**
   * Get PR head SHA for posting review comments.
   */
  private async getPrHeadSha(owner: string, repo: string, prNumber: number): Promise<string> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
      headers: { 'Authorization': `token ${this.token}` },
    });

    if (!response.ok) {
      throw new AppError(`Gitea: failed to get PR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const pr = await response.json() as { head: { sha: string } };
    return pr.head.sha;
  }
}

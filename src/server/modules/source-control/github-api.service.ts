/**
 * GitHub API Service
 *
 * Implements ScmApiService for GitHub.
 * Uses GitHub REST API v3 for PR comments and commit statuses.
 *
 * @module source-control/github-api
 */

import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { HTTP } from '@/server/http/constants';
import type { ScmApiService, ScmBaseCredentials, CommitStatus, InlineReviewComment, ChangedFile } from './scm-api.service';
import { extractFingerprintFromMarker, parsePatchToChangedLines } from './scm-api.service';

/** Dedup lock for concurrent PR comment posts per (owner/repo/prNumber/scanId). */
const prCommentLocks = new Map<string, Promise<'created' | 'updated'>>();

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
  private graphqlUrl: string;

  constructor(credentials: ScmBaseCredentials) {
    // GitHub API: https://api.github.com or custom Enterprise URL
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
    // Derive GraphQL URL from base URL
    // github.com → api.github.com/graphql, enterprise → {host}/api/graphql
    this.graphqlUrl = this.baseUrl.includes('api.github.com')
      ? 'https://api.github.com/graphql'
      : `${this.baseUrl}/api/graphql`;
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
      throw new AppError(`GitHub PR comment failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
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
      throw new AppError(`GitHub update PR comment failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('GitHub: PR comment updated', { owner, repo, commentId });
  }

  /**
   * Post or update a PR comment (dedup by scan ID).
   * Uses a Promise-based lock to prevent concurrent duplicate posts.
   */
  async postOrUpdatePrComment(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    body: string,
  ): Promise<'created' | 'updated'> {
    const lockKey = `${owner}/${repo}/${prNumber}/${scanId}`;

    if (!prCommentLocks.has(lockKey)) {
      const operation = (async () => {
        const existingCommentId = await this.findPrComment(owner, repo, prNumber, scanId);
        if (existingCommentId) {
          await this.updatePrComment(owner, repo, prNumber, existingCommentId, body);
          return 'updated' as const;
        }
        await this.postPrComment(owner, repo, prNumber, body);
        return 'created' as const;
      })().finally(() => prCommentLocks.delete(lockKey));

      prCommentLocks.set(lockKey, operation);
    }

    return prCommentLocks.get(lockKey)!;
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
      throw new AppError(`GitHub commit status failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('GitHub: commit status created', { owner, repo, sha, status: status.status });
  }

  /**
   * Post inline review comments on specific lines of a PR.
   * GitHub API: POST /repos/{owner}/{repo}/pulls/{pull_number}/comments
   */
  async postInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    comments: InlineReviewComment[],
  ): Promise<{ created: number; updated: number }> {
    let created = 0;

    const headSha = await this.getPrHeadSha(owner, repo, prNumber);

    for (const comment of comments) {
      try {
        const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;

        logger.scan.info('GitHub: posting inline review comment', {
          owner, repo, prNumber, path: comment.filePath, line: comment.lineNumber,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
          body: JSON.stringify({
            body: `<!-- sast-integration:inline-review:${comment.fingerprint} -->\n${comment.body}`,
            path: comment.filePath,
            line: comment.lineNumber,
            commit_id: headSha,
          }),
        });

        if (response.ok) {
          created++;
          logger.scan.info('GitHub: inline review comment posted', {
            owner, repo, prNumber, path: comment.filePath, line: comment.lineNumber,
          });
        } else {
          const errorText = await response.text();
          logger.scan.warn('GitHub: inline review comment failed', {
            status: response.status, error: errorText, path: comment.filePath, line: comment.lineNumber,
          });
        }
      } catch (err) {
        logger.scan.warn('GitHub: inline review comment error', {
          error: (err as Error).message, path: comment.filePath, line: comment.lineNumber,
        });
      }
    }

    return { created, updated: 0 };
  }

  /**
   * List all SAST inline review comment fingerprints on a PR.
   */
  async listExistingInlineFingerprints(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Set<string>> {
    const fingerprints = new Set<string>();
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) return fingerprints;

      const comments = await response.json() as Array<{ id: number; body: string }>;
      for (const comment of comments) {
        const fp = extractFingerprintFromMarker(comment.body);
        if (fp) fingerprints.add(fp);
      }
    } catch (err) {
      logger.scan.warn('GitHub: failed to list inline fingerprints', { error: (err as Error).message });
    }
    return fingerprints;
  }

  /**
   * Resolve (close) inline review comments for resolved findings.
   * GitHub requires GraphQL resolveReviewThread mutation with thread ID.
   * Falls back to REST DELETE if GraphQL fails.
   */
  async resolveInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    fingerprints: string[],
  ): Promise<{ resolved: number; failed: number }> {
    if (fingerprints.length === 0) return { resolved: 0, failed: 0 };

    let resolved = 0;
    let failed = 0;
    const resolvedFingerprintSet = new Set(fingerprints);

    try {
      // 1. List PR review comments to find matching fingerprints
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) return { resolved: 0, failed: 0 };

      const comments = await response.json() as Array<{ id: number; body: string; pull_request_review_id: number }>;

      // Filter comments matching our marker and resolved fingerprints
      const toResolve = comments.filter((c) => {
        const fp = extractFingerprintFromMarker(c.body);
        return fp && resolvedFingerprintSet.has(fp);
      });

      if (toResolve.length === 0) return { resolved: 0, failed: 0 };

      // 2. Fetch review threads via GraphQL to map comment → thread ID
      const threadMap = await this.getReviewThreadMap(owner, repo, prNumber);

      for (const comment of toResolve) {
        const fp = extractFingerprintFromMarker(comment.body);
        const threadId = threadMap.get(comment.id);

        if (threadId) {
          // Try GraphQL resolve
          const success = await this.resolveReviewThread(threadId);
          if (success) {
            resolved++;
            logger.scan.info('GitHub: inline comment resolved via GraphQL', { commentId: comment.id, fingerprint: fp });
            continue;
          }
        }

        // Fallback: REST delete
        try {
          const deleteUrl = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments/${comment.id}`;
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          });
          if (deleteResponse.ok) {
            resolved++;
            logger.scan.info('GitHub: inline comment deleted (resolve fallback)', { commentId: comment.id, fingerprint: fp });
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }
    } catch (err) {
      logger.scan.warn('GitHub: resolve inline comments failed', { error: (err as Error).message });
    }

    logger.scan.info('GitHub: resolve inline comments done', { resolved, failed, inputCount: fingerprints.length });
    return { resolved, failed };
  }

  /**
   * Update inline review comments when verdict changes.
   * GitHub supports PATCH to edit comment body directly.
   */
  async updateInlineReviewComments(
    owner: string,
    repo: string,
    prNumber: number,
    comments: Array<{ fingerprint: string; filePath: string; lineNumber: number; body: string; scanner: string }>,
  ): Promise<{ updated: number; failed: number }> {
    if (comments.length === 0) return { updated: 0, failed: 0 };

    let updated = 0;
    let failed = 0;

    for (const c of comments) {
      try {
        // Find existing comment by fingerprint
        const existingCommentId = await this.findCommentIdByFingerprint(owner, repo, prNumber, c.fingerprint);

        if (existingCommentId) {
          // GitHub supports editing comment body via PATCH
          const patchUrl = `${this.baseUrl}/repos/${owner}/${repo}/pulls/comments/${existingCommentId}`;
          const patchResponse = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
              body: `<!-- sast-integration:inline-review:${c.fingerprint} -->\n${c.body}`,
            }),
          });

          if (patchResponse.ok) {
            updated++;
          } else {
            failed++;
            logger.scan.warn('GitHub: failed to PATCH inline comment', { commentId: existingCommentId, status: patchResponse.status });
          }
        } else {
          // Comment doesn't exist yet — post new
          const headSha = await this.getPrHeadSha(owner, repo, prNumber);
          const postUrl = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments`;
          const postResponse = await fetch(postUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
            body: JSON.stringify({
              body: `<!-- sast-integration:inline-review:${c.fingerprint} -->\n${c.body}`,
              path: c.filePath,
              line: c.lineNumber,
              commit_id: headSha,
            }),
          });

          if (postResponse.ok) {
            updated++;
          } else {
            failed++;
          }
        }
      } catch (err) {
        failed++;
        logger.scan.warn('GitHub: update inline comment error', { fingerprint: c.fingerprint, error: (err as Error).message });
      }
    }

    logger.scan.info('GitHub: update inline comments done', { updated, failed, inputCount: comments.length });
    return { updated, failed };
  }

  /**
   * Find a review comment ID by its fingerprint marker.
   */
  private async findCommentIdByFingerprint(owner: string, repo: string, prNumber: number, fingerprint: string): Promise<number | null> {
    try {
      const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/comments?per_page=100`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      if (!response.ok) return null;

      const comments = await response.json() as Array<{ id: number; body: string }>;
      for (const comment of comments) {
        const fp = extractFingerprintFromMarker(comment.body);
        if (fp === fingerprint) return comment.id;
      }
    } catch (err) {
      logger.scan.warn('GitHub: findCommentIdByFingerprint failed', { fingerprint, error: (err as Error).message });
    }
    return null;
  }

  /**
   * Fetch review threads for a PR and build a map: commentId → threadId (GraphQL node ID).
   */
  private async getReviewThreadMap(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Map<number, string>> {
    const threadMap = new Map<number, string>();

    try {
      const query = `
        query($owner: String!, $name: String!, $number: Int!) {
          repository(owner: $owner, name: $name) {
            pullRequest(number: $number) {
              reviewThreads(first: 100) {
                nodes {
                  id
                  comments(first: 10) {
                    nodes {
                      databaseId
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables: { owner, name: repo, number: prNumber } }),
      });

      if (!response.ok) return threadMap;

      const data = await response.json() as {
        data?: {
          repository?: {
            pullRequest?: {
              reviewThreads?: {
                nodes: Array<{
                  id: string;
                  comments: { nodes: Array<{ databaseId: number }> };
                }>;
              };
            };
          };
        };
      };

      const threads = data.data?.repository?.pullRequest?.reviewThreads?.nodes ?? [];
      for (const thread of threads) {
        for (const comment of thread.comments.nodes) {
          if (comment.databaseId) {
            threadMap.set(comment.databaseId, thread.id);
          }
        }
      }
    } catch (err) {
      logger.scan.warn('GitHub: failed to fetch review threads', { error: (err as Error).message });
    }

    return threadMap;
  }

  /**
   * Resolve a review thread via GraphQL.
   */
  private async resolveReviewThread(threadId: string): Promise<boolean> {
    try {
      const mutation = `
        mutation($threadId: ID!) {
          resolveReviewThread(input: { threadId: $threadId }) {
            thread {
              isResolved
            }
          }
        }
      `;

      const response = await fetch(this.graphqlUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query: mutation, variables: { threadId } }),
      });

      if (!response.ok) {
        logger.scan.warn('GitHub: resolveReviewThread failed', { status: response.status });
        return false;
      }

      const data = await response.json() as {
        data?: { resolveReviewThread?: { thread?: { isResolved?: boolean } } };
        errors?: Array<{ message: string }>;
      };

      if (data.errors?.length) {
        logger.scan.warn('GitHub: resolveReviewThread GraphQL errors', { errors: data.errors });
        return false;
      }

      return data.data?.resolveReviewThread?.thread?.isResolved ?? false;
    } catch (err) {
      logger.scan.warn('GitHub: resolveReviewThread error', { error: (err as Error).message });
      return false;
    }
  }

  /**
   * Get PR head SHA for posting review comments.
   */
  private async getPrHeadSha(owner: string, repo: string, prNumber: number): Promise<string> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      throw new AppError(`GitHub: failed to get PR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const pr = await response.json() as { head: { sha: string } };
    return pr.head.sha;
  }

  /**
   * Get list of files changed in a PR with line-level diff info.
   * GitHub API: GET /repos/{owner}/{repo}/pulls/{prNumber}/files
   */
  async getPrChangedFiles(owner: string, repo: string, prNumber: number): Promise<ChangedFile[]> {
    const url = `${this.baseUrl}/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=300`;

    logger.scan.info('GitHub: getting PR changed files', { owner, repo, prNumber });

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.warn('GitHub: get PR files failed', { status: response.status, error: errorText });
      return [];
    }

    const files = await response.json() as Array<{
      filename: string;
      patch?: string;
      status: string;
    }>;

    const changedFiles: ChangedFile[] = [];

    for (const file of files) {
      if (file.status === 'removed') continue;

      const changedLines = file.patch ? parsePatchToChangedLines(file.patch) : [];

      changedFiles.push({
        filePath: file.filename,
        changedLines,
      });
    }

    logger.scan.info('GitHub: PR changed files retrieved', { owner, repo, prNumber, fileCount: changedFiles.length });

    return changedFiles;
  }
}

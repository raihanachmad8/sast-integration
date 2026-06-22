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
import type { ScmApiService, ScmCredentials, CommitStatus, InlineReviewComment, ChangedFile } from './scm-api.service';
import { extractFingerprintFromMarker, parsePatchToChangedLines } from './scm-api.service';

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
  private credentials: ScmCredentials;

  constructor(credentials: ScmCredentials) {
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
    this.credentials = credentials;
  }

  /**
   * Fetch with automatic token refresh on 401.
   * Retries once after refreshing the OAuth token.
   */
  private async fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = {
      ...init.headers,
      'Authorization': `token ${this.token}`,
    };

    const response = await fetch(url, { ...init, headers });

    if (response.status === 401 && this.credentials.refreshToken && this.credentials.clientId && this.credentials.clientSecret) {
      logger.scan.info('Gitea: token expired, attempting refresh', { url });

      const refreshed = await this.refreshToken();
      if (refreshed) {
        this.token = refreshed.accessToken;

        // Persist new token to DB
        if (this.credentials.sourceControlId) {
          try {
            const { sourceControlRepository } = await import('./source-control.repository');
            await sourceControlRepository.update(this.credentials.sourceControlId, {
              credentials: {
                ...this.credentials,
                token: refreshed.accessToken,
                refreshToken: refreshed.refreshToken || this.credentials.refreshToken,
                tokenExpiresAt: Date.now() + (refreshed.expiresIn || 3600) * 1000,
              },
            });
          } catch (e) {
            logger.scan.warn('Gitea: failed to persist refreshed token', { error: (e as Error).message });
          }
        }

        // Retry with new token
        const retryHeaders = {
          ...init.headers,
          'Authorization': `token ${refreshed.accessToken}`,
        };
        return fetch(url, { ...init, headers: retryHeaders });
      }
    }

    return response;
  }

  /**
   * Refresh Gitea OAuth token using refresh_token.
   */
  private async refreshToken(): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
    const { clientId, clientSecret, refreshToken, baseUrl } = this.credentials;
    if (!clientId || !clientSecret || !refreshToken) return null;

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
        logger.scan.info('Gitea: token refreshed successfully');
        return {
          accessToken: payload.access_token,
          refreshToken: payload.refresh_token || refreshToken,
          expiresIn: payload.expires_in || undefined,
        };
      }
    } catch (e) {
      logger.scan.error('Gitea: token refresh failed', { error: (e as Error).message });
    }
    return null;
  }

  /**
   * Post a comment on a pull request (issue).
   * Gitea treats PRs as issues, so we use the issues API.
   */
  async postPrComment(owner: string, repo: string, prNumber: number, body: string): Promise<void> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/issues/${prNumber}/comments`;

    logger.scan.info('Gitea: posting PR comment', { owner, repo, prNumber, bodyLength: body.length });

    const response = await this.fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

    const response = await this.fetchWithAuth(url);

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

    const response = await this.fetchWithAuth(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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

    const response = await this.fetchWithAuth(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
   * Posts SEPARATE reviews per scanner to keep findings organized.
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

    try {
      // Fetch PR diff to determine which lines are actually changed
      const diffText = await this.getPrDiff(owner, repo, prNumber);
      const changedLines = this.parseDiffNewLineMap(diffText);

      // Filter comments to only include lines that exist in the diff
      const validComments = comments.filter((c) => {
        const normalizedPath = this.normalizeFilePath(c.filePath);
        const lineSet = changedLines.get(normalizedPath);
        return lineSet?.has(c.lineNumber) ?? false;
      });

      if (validComments.length === 0) {
        logger.scan.info('Gitea: no valid inline comments (none on changed lines)', { owner, repo, prNumber });
        return { created: 0, updated: 0 };
      }

      // Group comments by scanner — post separate review per scanner
      const byScanner = new Map<string, InlineReviewComment[]>();
      for (const c of validComments) {
        const scanner = c.scanner || 'unknown';
        const list = byScanner.get(scanner) || [];
        list.push(c);
        byScanner.set(scanner, list);
      }

      const headSha = await this.getPrHeadSha(owner, repo, prNumber);
      const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;

      // Post one review per scanner
      for (const [scanner, scannerComments] of byScanner) {
        logger.scan.info('Gitea: posting inline review comments', {
          owner, repo, prNumber, scanner, commentCount: scannerComments.length, headSha,
        });

        const reviewComments = scannerComments.map((c) => ({
          body: `<!-- sast-integration:inline-review:${c.fingerprint} -->\n${c.body}`,
          path: this.normalizeFilePath(c.filePath),
          new_position: c.lineNumber,
        }));

        const response = await this.fetchWithAuth(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: `## 🔒 SAST Security Analysis — ${scanner}\n\nFound ${scannerComments.length} issue(s) from ${scanner}.\n\n---\n*Scan: \`${scanId.substring(0, 8)}\`*`,
            event: 'COMMENT',
            commit_id: headSha,
            comments: reviewComments,
          }),
        });

        if (response.ok) {
          const review = await response.json() as { id: number; state: string };
          created += scannerComments.length;
          logger.scan.info('Gitea: inline review comments posted', {
            owner, repo, prNumber, scanner, count: scannerComments.length, reviewId: review.id, reviewState: review.state, commitId: headSha,
          });
        } else {
          const errorText = await response.text();
          logger.scan.warn('Gitea: inline review comments failed', {
            scanner, status: response.status, error: errorText,
          });
        }
      }
    } catch (err) {
      logger.scan.warn('Gitea: inline review comments error', {
        error: (err as Error).message,
      });
    }

    return { created, updated: 0 };
  }

  /**
   * List all SAST inline review comment fingerprints on a PR.
   * Scans for the marker <!-- sast-integration:inline-review:{fingerprint} -->.
   */
  async listExistingInlineFingerprints(
    owner: string,
    repo: string,
    prNumber: number,
  ): Promise<Set<string>> {
    const fingerprints = new Set<string>();
    try {
      // Gitea API: list reviews first, then get comments per review
      const reviewsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews?limit=100`;
      const reviewsResponse = await this.fetchWithAuth(reviewsUrl);
      if (!reviewsResponse.ok) return fingerprints;

      const reviews = await reviewsResponse.json() as Array<{ id: number; comments_count: number }>;

      for (const review of reviews) {
        if (!review.comments_count) continue;
        const commentsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews/${review.id}/comments?limit=100`;
        const commentsResponse = await this.fetchWithAuth(commentsUrl);
        if (!commentsResponse.ok) continue;

        const comments = await commentsResponse.json() as Array<{ id: number; body?: string }>;
        for (const comment of comments) {
          const fp = extractFingerprintFromMarker(comment.body ?? '');
          if (fp) fingerprints.add(fp);
        }
      }
    } catch (err) {
      logger.scan.warn('Gitea: failed to list inline fingerprints', { error: (err as Error).message });
    }
    return fingerprints;
  }

  /**
   * Resolve (close) inline review comments for resolved findings.
   * Uses POST /repos/{owner}/{repo}/pulls/comments/{id}/resolve (Gitea 1.26+).
   * Falls back to DELETE if resolve endpoint is unavailable (older Gitea).
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
      // Gitea API: list reviews first, then get comments per review
      const reviewsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews?limit=100`;
      const reviewsResponse = await this.fetchWithAuth(reviewsUrl);
      if (!reviewsResponse.ok) return { resolved: 0, failed: 0 };

      const reviews = await reviewsResponse.json() as Array<{ id: number; comments_count: number }>;

      for (const review of reviews) {
        if (!review.comments_count) continue;
        const commentsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews/${review.id}/comments?limit=100`;
        const commentsResponse = await this.fetchWithAuth(commentsUrl);
        if (!commentsResponse.ok) continue;

        const comments = await commentsResponse.json() as Array<{ id: number; body?: string }>;

        for (const comment of comments) {
          const fp = extractFingerprintFromMarker(comment.body ?? '');
          if (!fp || !resolvedFingerprintSet.has(fp)) continue;

          // Try resolve first (Gitea 1.26+ endpoint: /pulls/comments/{id}/resolve)
          const resolveUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/comments/${comment.id}/resolve`;
          const resolveResponse = await this.fetchWithAuth(resolveUrl, { method: 'POST' });

          if (resolveResponse.ok) {
            resolved++;
            logger.scan.info('Gitea: inline comment resolved', { commentId: comment.id, fingerprint: fp });
          } else {
            // Fallback: delete if resolve endpoint unavailable (404) or other error
            const deleteUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/comments/${comment.id}`;
            const deleteResponse = await this.fetchWithAuth(deleteUrl, { method: 'DELETE' });
            if (deleteResponse.ok) {
              resolved++;
              logger.scan.info('Gitea: inline comment deleted (resolve fallback)', { commentId: comment.id, fingerprint: fp });
            } else {
              failed++;
              logger.scan.warn('Gitea: failed to resolve/delete inline comment', { commentId: comment.id, fingerprint: fp });
            }
          }
        }
      }
    } catch (err) {
      logger.scan.warn('Gitea: resolve inline comments failed', { error: (err as Error).message });
    }

    logger.scan.info('Gitea: resolve inline comments done', { resolved, failed, inputCount: fingerprints.length });
    return { resolved, failed };
  }

  /**
   * Update inline review comments when verdict changes.
   * For each comment: find existing by fingerprint, delete old, post new review with updated body.
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
    const headSha = await this.getPrHeadSha(owner, repo, prNumber);

    for (const c of comments) {
      try {
        // Find existing comment ID by fingerprint
        const existingCommentId = await this.findCommentIdByFingerprint(owner, repo, prNumber, c.fingerprint);

        if (existingCommentId) {
          // Delete old comment
          const deleteUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/comments/${existingCommentId}`;
          const deleteResp = await this.fetchWithAuth(deleteUrl, { method: 'DELETE' });
          if (!deleteResp.ok && deleteResp.status !== 404) {
            logger.scan.warn('Gitea: failed to delete old inline comment', { commentId: existingCommentId, status: deleteResp.status });
          }
        }

        // Post new review with updated comment
        const reviewUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews`;
        const response = await this.fetchWithAuth(reviewUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: `## 🔒 SAST Security Analysis — ${c.scanner}\n\nUpdated finding verification.\n\n---\n*Scan: updated inline*`,
            event: 'COMMENT',
            commit_id: headSha,
            comments: [{
              body: `<!-- sast-integration:inline-review:${c.fingerprint} -->\n${c.body}`,
              path: this.normalizeFilePath(c.filePath),
              new_position: c.lineNumber,
            }],
          }),
        });

        if (response.ok) {
          updated++;
        } else {
          failed++;
          logger.scan.warn('Gitea: failed to post updated inline comment', { fingerprint: c.fingerprint, status: response.status });
        }
      } catch (err) {
        failed++;
        logger.scan.warn('Gitea: update inline comment error', { fingerprint: c.fingerprint, error: (err as Error).message });
      }
    }

    logger.scan.info('Gitea: update inline comments done', { updated, failed, inputCount: comments.length });
    return { updated, failed };
  }

  /**
   * Find a review comment ID by its fingerprint marker.
   */
  private async findCommentIdByFingerprint(owner: string, repo: string, prNumber: number, fingerprint: string): Promise<number | null> {
    try {
      const reviewsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews?limit=100`;
      const reviewsResp = await this.fetchWithAuth(reviewsUrl);
      if (!reviewsResp.ok) return null;

      const reviews = await reviewsResp.json() as Array<{ id: number; comments_count?: number }>;
      for (const review of reviews) {
        if (!review.comments_count) continue;
        const commentsUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/reviews/${review.id}/comments?limit=100`;
        const commentsResp = await this.fetchWithAuth(commentsUrl);
        if (!commentsResp.ok) continue;

        const comments = await commentsResp.json() as Array<{ id: number; body?: string }>;
        for (const comment of comments) {
          const fp = extractFingerprintFromMarker(comment.body ?? '');
          if (fp === fingerprint) return comment.id;
        }
      }
    } catch (err) {
      logger.scan.warn('Gitea: findCommentIdByFingerprint failed', { fingerprint, error: (err as Error).message });
    }
    return null;
  }

  /**
   * Get PR head SHA for posting review comments.
   */
  /**
   * Fetch the unified diff text for a PR.
   */
  private async getPrDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}.diff`;
    const response = await this.fetchWithAuth(url, {
      headers: { 'Accept': 'text/plain' },
    });

    if (!response.ok) {
      logger.scan.warn('Gitea: failed to fetch PR diff', { status: response.status });
      return '';
    }

    return response.text();
  }

  /**
   * Parse unified diff text to extract new line numbers per file.
   * Returns Map<filePath, Set<newLineNumber>>.
   */
  private parseDiffNewLineMap(diffText: string): Map<string, Set<number>> {
    const fileLineMap = new Map<string, Set<number>>();
    const lines = diffText.split(/\r?\n/);
    let currentFile: string | null = null;
    let currentNewLine: number | null = null;

    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        currentFile = line.slice(6).trim();
        if (!fileLineMap.has(currentFile)) {
          fileLineMap.set(currentFile, new Set<number>());
        }
        currentNewLine = null;
        continue;
      }

      if (line.startsWith('@@')) {
        const match = /@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
        currentNewLine = match ? Number.parseInt(match[1] ?? '0', 10) : null;
        continue;
      }

      if (!currentFile || currentNewLine === null) continue;

      if (line.startsWith('+') && !line.startsWith('+++')) {
        fileLineMap.get(currentFile)?.add(currentNewLine);
        currentNewLine += 1;
        continue;
      }

      if (line.startsWith(' ') || line.length === 0) {
        currentNewLine += 1;
        continue;
      }

      if (line.startsWith('-') && !line.startsWith('---')) {
        continue;
      }
    }

    return fileLineMap;
  }

  /**
   * Strips Docker workspace prefix from absolute file paths.
   * CI/CD scanners run in Docker with working dir /workspace/Owner/repo/
   * producing paths like /workspace/MeAdmin/net-scanner/vulnerable_module.c
   * Gitea API requires relative paths like vulnerable_module.c
   */
  private normalizeFilePath(filePath: string): string {
    // Match /workspace/{owner}/{repo}/ prefix
    const match = filePath.match(/^\/workspace\/[^/]+\/[^/]+\/(.+)$/);
    return match ? match[1] : filePath;
  }

  private async getPrHeadSha(owner: string, repo: string, prNumber: number): Promise<string> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}`;
    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      throw new AppError(`Gitea: failed to get PR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const pr = await response.json() as { head: { sha: string } };
    return pr.head.sha;
  }

  /**
   * Get list of files changed in a PR with line-level diff info.
   * Gitea API: GET /repos/{owner}/{repo}/pulls/{prNumber}/files
   *
   * Gitea 1.26 does NOT return the `patch` field in the PR files response.
   * Fallback: fetch file contents from head/base commits and compute changed lines.
   */
  async getPrChangedFiles(owner: string, repo: string, prNumber: number): Promise<ChangedFile[]> {
    const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}/files?limit=300`;

    logger.scan.info('Gitea: getting PR changed files', { owner, repo, prNumber });

    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.warn('Gitea: get PR files failed', { status: response.status, error: errorText });
      return [];
    }

    const files = await response.json() as Array<{
      filename: string;
      patch?: string;
      status: string;
      additions?: number;
      deletions?: number;
    }>;

    // Check if any file has patch data (Gitea 1.26+ may not include it)
    const hasPatch = files.some((f) => !!f.patch);

    let headSha: string | null = null;
    let baseSha: string | null = null;

    if (!hasPatch) {
      // Fetch PR metadata to get head/base commit SHAs for content-based diff
      try {
        const prUrl = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/pulls/${prNumber}`;
        const prResponse = await this.fetchWithAuth(prUrl);
        if (prResponse.ok) {
          const pr = await prResponse.json() as { head?: { sha?: string }; base?: { sha?: string } };
          headSha = pr.head?.sha ?? null;
          baseSha = pr.base?.sha ?? null;
          logger.scan.info('Gitea: PR metadata for content-based diff', { prNumber, headSha: headSha?.substring(0, 8), baseSha: baseSha?.substring(0, 8) });
        }
      } catch (err) {
        logger.scan.warn('Gitea: failed to fetch PR metadata for fallback', { error: (err as Error).message });
      }
    }

    const changedFiles: ChangedFile[] = [];

    for (const file of files) {
      // Skip deleted files — no new file lines to match against
      if (file.status === 'removed') continue;

      let changedLines: number[] = [];

      if (file.patch) {
        // Use patch if available (Gitea < 1.26 or future versions)
        changedLines = parsePatchToChangedLines(file.patch);
      } else if (file.status === 'added' && headSha) {
        // Added file: ALL lines are new. Fetch file content to get line numbers.
        const lineCount = await this.getFileLineCount(owner, repo, file.filename, headSha);
        if (lineCount > 0) {
          changedLines = Array.from({ length: lineCount }, (_, i) => i + 1);
        }
        logger.scan.info('Gitea: added file fallback', { filename: file.filename, lineCount, headSha: headSha.substring(0, 8) });
      } else if ((file.status === 'changed' || file.status === 'modified') && headSha && baseSha) {
        // Modified file: compute diff from file contents
        changedLines = await this.computeChangedLines(owner, repo, file.filename, headSha, baseSha);
        logger.scan.info('Gitea: modified file fallback', { filename: file.filename, changedLineCount: changedLines.length, headSha: headSha.substring(0, 8), baseSha: baseSha.substring(0, 8) });
      }

      changedFiles.push({
        filePath: file.filename,
        changedLines,
      });
    }

    logger.scan.info('Gitea: PR changed files retrieved', { owner, repo, prNumber, fileCount: changedFiles.length, hasPatch });

    return changedFiles;
  }

  /**
   * Get the number of lines in a file at a given commit SHA.
   * Uses Gitea contents API: GET /repos/{owner}/{repo}/contents/{path}?ref={sha}
   */
  private async getFileLineCount(owner: string, repo: string, path: string, sha: string): Promise<number> {
    try {
      const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/contents/${path}?ref=${sha}`;
      const response = await this.fetchWithAuth(url);
      if (!response.ok) return 0;

      const content = await response.json() as { content?: string; encoding?: string };
      if (!content.content) return 0;

      const decoded = Buffer.from(content.content, 'base64').toString('utf-8');
      return decoded.split('\n').length;
    } catch {
      return 0;
    }
  }

  /**
   * Compute which lines in a file changed between two commit SHAs.
   * Fetches file content from both SHAs and performs a simple line-by-line comparison.
   * Returns line numbers (1-indexed) in the HEAD version that differ from the BASE version.
   */
  private async computeChangedLines(owner: string, repo: string, path: string, headSha: string, baseSha: string): Promise<number[]> {
    try {
      const [headContent, baseContent] = await Promise.all([
        this.getFileContent(owner, repo, path, headSha),
        this.getFileContent(owner, repo, path, baseSha),
      ]);

      // If either file is missing (new file or deleted), treat all head lines as changed
      if (!headContent) return [];
      if (!baseContent) {
        return Array.from({ length: headContent.split('\n').length }, (_, i) => i + 1);
      }

      const headLines = headContent.split('\n');
      const baseLines = baseContent.split('\n');
      const changedLines: number[] = [];

      // Simple diff: compare line by line up to the shorter file, then mark all remaining as changed
      const maxLen = Math.max(headLines.length, baseLines.length);
      for (let i = 0; i < maxLen; i++) {
        if (i >= headLines.length || i >= baseLines.length || headLines[i] !== baseLines[i]) {
          if (i < headLines.length) {
            changedLines.push(i + 1); // 1-indexed
          }
        }
      }

      return changedLines;
    } catch {
      return [];
    }
  }

  /**
   * Get raw file content as string from Gitea contents API.
   */
  private async getFileContent(owner: string, repo: string, path: string, sha: string): Promise<string | null> {
    try {
      const url = `${this.baseUrl}/api/v1/repos/${owner}/${repo}/contents/${path}?ref=${sha}`;
      const response = await this.fetchWithAuth(url);
      if (!response.ok) return null;

      const content = await response.json() as { content?: string; encoding?: string };
      if (!content.content) return null;

      return Buffer.from(content.content, 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }
}

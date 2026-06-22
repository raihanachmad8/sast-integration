/**
 * GitLab API Service
 *
 * Implements ScmApiService for GitLab.
 * Uses GitLab API v4 for MR notes (comments) and commit statuses.
 *
 * @module source-control/gitlab-api
 */

import { logger } from '@/server/lib/logger';
import { AppError } from '@/server/http/errors';
import { HTTP } from '@/server/http/constants';
import type { ScmApiService, ScmOAuthCredentials, CommitStatus, InlineReviewComment, ChangedFile } from './scm-api.service';
import { extractFingerprintFromMarker, parsePatchToChangedLines, refreshOAuthToken } from './scm-api.service';
import type { RefreshedTokens } from './scm-api.service';

/** Dedup lock for concurrent token refresh per sourceControlId. */
const refreshLocks = new Map<string, Promise<RefreshedTokens | null>>();

/** Dedup lock for concurrent PR comment posts per (owner/repo/prNumber/scanId). */
const prCommentLocks = new Map<string, Promise<'created' | 'updated'>>();

/**
 * GitLab implementation of ScmApiService.
 *
 * @example
 * ```ts
 * const gitlab = new GitLabScmService({ baseUrl: 'https://gitlab.com', token: 'glpat-xxx' });
 * await gitlab.postOrUpdatePrComment('owner', 'repo', 123, 'scan-id', '## SAST Report\n...');
 * await gitlab.createCommitStatus('owner', 'repo', 'sha123', { status: 'success', description: 'Passed', context: 'sast/gate' });
 * ```
 */
export class GitLabScmService implements ScmApiService {
  private baseUrl: string;
  private token: string;
  private credentials: ScmOAuthCredentials;

  constructor(credentials: ScmOAuthCredentials) {
    // GitLab API: https://gitlab.com/api/v4 or custom URL
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
    this.credentials = credentials;
  }

  /**
   * Fetch with automatic token refresh on 401.
   * GitLab OAuth supports refresh_token flow.
   */
  private async fetchWithAuth(url: string, init: RequestInit = {}): Promise<Response> {
    const headers = {
      ...init.headers,
      'PRIVATE-TOKEN': this.token,
    };

    const response = await fetch(url, { ...init, headers });

    if (response.status === 401 && this.credentials.refreshToken && this.credentials.clientId && this.credentials.clientSecret) {
      logger.scan.info('GitLab: token expired, attempting refresh', { url });

      const lockKey = this.credentials.sourceControlId || 'default';

      if (!refreshLocks.has(lockKey)) {
        const refreshPromise = refreshOAuthToken('gitlab', {
          baseUrl: this.credentials.baseUrl,
          token: this.token,
          clientId: this.credentials.clientId,
          clientSecret: this.credentials.clientSecret,
          refreshToken: this.credentials.refreshToken,
        }).finally(() => refreshLocks.delete(lockKey));
        refreshLocks.set(lockKey, refreshPromise);
      }

      const refreshed = await refreshLocks.get(lockKey);
      if (refreshed) {
        this.token = refreshed.accessToken;
        this.credentials = {
          ...this.credentials,
          token: refreshed.accessToken,
          refreshToken: refreshed.refreshToken || this.credentials.refreshToken,
        };

        // Persist new token to DB with retry
        if (this.credentials.sourceControlId) {
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              const { sourceControlRepository } = await import('./source-control.repository');
              await sourceControlRepository.update(this.credentials.sourceControlId, {
                credentials: {
                  ...this.credentials,
                  tokenExpiresAt: Date.now() + (refreshed.expiresIn || 3600) * 1000,
                },
              });
              break;
            } catch (e) {
              logger.scan.warn('GitLab: DB persist retry', { attempt: attempt + 1, error: (e as Error).message });
            }
          }
        }

        // Retry with new token
        const retryHeaders = {
          ...init.headers,
          'PRIVATE-TOKEN': refreshed.accessToken,
        };
        return fetch(url, { ...init, headers: retryHeaders });
      }
    }

    return response;
  }

  /**
   * Get project ID from owner/repo format.
   * GitLab uses project IDs or URL-encoded paths.
   */
  private getProjectId(owner: string, repo: string): string {
    return encodeURIComponent(`${owner}/${repo}`);
  }

  /**
   * Post a note (comment) on a merge request.
   * GitLab API: POST /projects/:id/merge_requests/:merge_request_iid/notes
   */
  async postPrComment(owner: string, repo: string, mrIid: number, body: string): Promise<void> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes`;

    logger.scan.info('GitLab: posting MR note', { owner, repo, mrIid, bodyLength: body.length });

    const response = await this.fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitLab: MR note failed', { status: response.status, error: errorText });
      throw new AppError(`GitLab MR note failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('GitLab: MR note posted', { owner, repo, mrIid });
  }

  /**
   * Find an existing MR note by scan ID marker.
   * GitLab API: GET /projects/:id/merge_requests/:merge_request_iid/notes
   */
  async findPrComment(owner: string, repo: string, mrIid: number, scanId: string): Promise<number | null> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100`;

    logger.scan.info('GitLab: finding MR note', { owner, repo, mrIid, scanId });

    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      logger.scan.warn('GitLab: failed to list MR notes', { status: response.status });
      return null;
    }

    const notes = await response.json() as Array<{ id: number; body: string }>;
    const scanIdShort = scanId.substring(0, 8);

    for (const note of notes) {
      if (note.body.includes(`Scan: \`${scanIdShort}\``) || note.body.includes(`Scan: ${scanId}`)) {
        logger.scan.info('GitLab: found existing MR note', { noteId: note.id, scanId });
        return note.id;
      }
    }

    logger.scan.info('GitLab: no existing MR note found', { scanId });
    return null;
  }

  /**
   * Update an existing MR note.
   * GitLab API: PUT /projects/:id/merge_requests/:merge_request_iid/notes/:note_id
   */
  async updatePrComment(owner: string, repo: string, mrIid: number, noteId: number, body: string): Promise<void> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes/${noteId}`;

    logger.scan.info('GitLab: updating MR note', { owner, repo, mrIid, noteId, bodyLength: body.length });

    const response = await this.fetchWithAuth(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitLab: update MR note failed', { status: response.status, error: errorText });
      throw new AppError(`GitLab update MR note failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('GitLab: MR note updated', { owner, repo, mrIid, noteId });
  }

  /**
   * Post or update a MR note (dedup by scan ID).
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
        const existingNoteId = await this.findPrComment(owner, repo, prNumber, scanId);
        if (existingNoteId) {
          await this.updatePrComment(owner, repo, prNumber, existingNoteId, body);
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
   * Create a commit status (pipeline status).
   * GitLab API: POST /projects/:id/statuses/:sha
   */
  async createCommitStatus(owner: string, repo: string, sha: string, status: CommitStatus): Promise<void> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/statuses/${sha}`;

    // Map generic status to GitLab state
    const stateMap: Record<string, string> = {
      pending: 'pending',
      success: 'success',
      failure: 'failed',
      error: 'failed',
    };
    const state = stateMap[status.status] || 'pending';

    logger.scan.info('GitLab: creating commit status', { owner, repo, sha, status: status.status, context: status.context });

    const response = await this.fetchWithAuth(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        state,
        name: status.context,
        description: status.description,
        target_url: status.targetUrl,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.error('GitLab: commit status failed', { status: response.status, error: errorText });
      throw new AppError(`GitLab commit status failed: ${response.status} ${errorText}`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    logger.scan.info('GitLab: commit status created', { owner, repo, sha, status: status.status });
  }

  /**
   * Post inline review comments on specific lines of a MR.
   * GitLab API: POST /projects/:id/merge_requests/:merge_request_iid/discussions
   */
  async postInlineReviewComments(
    owner: string,
    repo: string,
    mrIid: number,
    scanId: string,
    comments: InlineReviewComment[],
  ): Promise<{ created: number; updated: number }> {
    const projectId = this.getProjectId(owner, repo);
    let created = 0;

    // Fetch MR diff_refs once (not per comment)
    const mrUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`;
    const mrResponse = await this.fetchWithAuth(mrUrl);
    if (!mrResponse.ok) return { created, updated: 0 };
    const mr = await mrResponse.json() as { diff_refs: { base_sha: string; head_sha: string; start_sha: string } };
    const { base_sha, head_sha, start_sha } = mr.diff_refs || {};

    for (const comment of comments) {
      try {
        const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`;

        logger.scan.info('GitLab: posting inline review comment', {
          owner, repo, mrIid, path: comment.filePath, line: comment.lineNumber,
        });

        const response = await this.fetchWithAuth(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            body: `<!-- sast-integration:inline-review:${comment.fingerprint} -->\n${comment.body}`,
            position: {
              position_type: 'text',
              new_path: comment.filePath,
              new_line: comment.lineNumber,
              base_sha,
              head_sha,
              start_sha,
            },
          }),
        });

        if (response.ok) {
          created++;
          logger.scan.info('GitLab: inline review comment posted', {
            owner, repo, mrIid, path: comment.filePath, line: comment.lineNumber,
          });
        } else {
          const errorText = await response.text();
          logger.scan.warn('GitLab: inline review comment failed', {
            status: response.status, error: errorText, path: comment.filePath, line: comment.lineNumber,
          });
        }
      } catch (err) {
        logger.scan.warn('GitLab: inline review comment error', {
          error: (err as Error).message, path: comment.filePath, line: comment.lineNumber,
        });
      }
    }

    return { created, updated: 0 };
  }

  /**
   * List all SAST inline review comment fingerprints on a MR.
   */
  async listExistingInlineFingerprints(
    owner: string,
    repo: string,
    mrIid: number,
  ): Promise<Set<string>> {
    const projectId = this.getProjectId(owner, repo);
    const fingerprints = new Set<string>();

    try {
      const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`;
      const response = await this.fetchWithAuth(url);
      if (!response.ok) return fingerprints;

      const discussions = await response.json() as Array<{
        id: string;
        notes: Array<{ id: number; body: string }>;
      }>;

      for (const discussion of discussions) {
        for (const note of discussion.notes) {
          const fp = extractFingerprintFromMarker(note.body);
          if (fp) fingerprints.add(fp);
        }
      }
    } catch (err) {
      logger.scan.warn('GitLab: failed to list inline fingerprints', { error: (err as Error).message });
    }
    return fingerprints;
  }

  /**
   * Resolve (close) inline review discussions for resolved findings.
   * GitLab API: PUT /projects/:id/merge_requests/:iid/discussions/:id with { resolved: true }
   * Falls back to DELETE if resolve fails.
   */
  async resolveInlineReviewComments(
    owner: string,
    repo: string,
    mrIid: number,
    fingerprints: string[],
  ): Promise<{ resolved: number; failed: number }> {
    if (fingerprints.length === 0) return { resolved: 0, failed: 0 };

    const projectId = this.getProjectId(owner, repo);
    let resolved = 0;
    let failed = 0;
    const resolvedFingerprintSet = new Set(fingerprints);

    try {
      const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`;
      const response = await this.fetchWithAuth(url);
      if (!response.ok) return { resolved: 0, failed: 0 };

      const discussions = await response.json() as Array<{
        id: string;
        notes: Array<{ id: number; body: string; resolved: boolean }>;
      }>;

      for (const discussion of discussions) {
        // Check if any note in this discussion has our marker with a resolved fingerprint
        const matchingNote = discussion.notes.find((note) => {
          const fp = extractFingerprintFromMarker(note.body);
          return fp && resolvedFingerprintSet.has(fp);
        });

        if (!matchingNote) continue;

        const fp = extractFingerprintFromMarker(matchingNote.body);

        // Skip if already resolved
        if (matchingNote.resolved) {
          resolved++;
          continue;
        }

        // Try to resolve the discussion
        const resolveUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions/${discussion.id}`;
        const resolveResponse = await this.fetchWithAuth(resolveUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resolved: true }),
        });

        if (resolveResponse.ok) {
          resolved++;
          logger.scan.info('GitLab: discussion resolved', { discussionId: discussion.id, fingerprint: fp });
        } else {
          // Fallback: delete the discussion
          const deleteResponse = await this.fetchWithAuth(resolveUrl, {
            method: 'DELETE',
          });
          if (deleteResponse.ok) {
            resolved++;
            logger.scan.info('GitLab: discussion deleted (resolve fallback)', { discussionId: discussion.id, fingerprint: fp });
          } else {
            failed++;
            logger.scan.warn('GitLab: failed to resolve/delete discussion', { discussionId: discussion.id, fingerprint: fp });
          }
        }
      }
    } catch (err) {
      logger.scan.warn('GitLab: resolve inline comments failed', { error: (err as Error).message });
    }

    logger.scan.info('GitLab: resolve inline comments done', { resolved, failed, inputCount: fingerprints.length });
    return { resolved, failed };
  }

  /**
   * Update inline review comments when verdict changes.
   * GitLab: resolve old discussion, post new discussion with updated body.
   */
  async updateInlineReviewComments(
    owner: string,
    repo: string,
    mrIid: number,
    comments: Array<{ fingerprint: string; filePath: string; lineNumber: number; body: string; scanner: string }>,
  ): Promise<{ updated: number; failed: number }> {
    if (comments.length === 0) return { updated: 0, failed: 0 };

    const projectId = this.getProjectId(owner, repo);
    let updated = 0;
    let failed = 0;

    // Fetch MR diff_refs once
    const mrUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`;
    const mrResponse = await this.fetchWithAuth(mrUrl);
    if (!mrResponse.ok) return { updated: 0, failed: comments.length };
    const mr = await mrResponse.json() as { diff_refs: { base_sha: string; head_sha: string; start_sha: string } };
    const { base_sha, head_sha, start_sha } = mr.diff_refs || {};

    for (const c of comments) {
      try {
        // Find existing discussion by fingerprint
        const existingDiscussionId = await this.findDiscussionIdByFingerprint(owner, repo, mrIid, c.fingerprint);

        if (existingDiscussionId) {
          // Resolve old discussion
          const resolveUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions/${existingDiscussionId}`;
          await this.fetchWithAuth(resolveUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resolved: true }),
          });
        }

        // Post new discussion with updated body
        const discussionUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`;
        const response = await this.fetchWithAuth(discussionUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            body: `<!-- sast-integration:inline-review:${c.fingerprint} -->\n${c.body}`,
            position: {
              position_type: 'text',
              new_path: c.filePath,
              new_line: c.lineNumber,
              base_sha,
              head_sha,
              start_sha,
            },
          }),
        });

        if (response.ok) {
          updated++;
        } else {
          failed++;
          logger.scan.warn('GitLab: failed to post updated inline comment', { fingerprint: c.fingerprint, status: response.status });
        }
      } catch (err) {
        failed++;
        logger.scan.warn('GitLab: update inline comment error', { fingerprint: c.fingerprint, error: (err as Error).message });
      }
    }

    logger.scan.info('GitLab: update inline comments done', { updated, failed, inputCount: comments.length });
    return { updated, failed };
  }

  /**
   * Find a discussion ID by its fingerprint marker.
   */
  private async findDiscussionIdByFingerprint(owner: string, repo: string, mrIid: number, fingerprint: string): Promise<string | null> {
    try {
      const projectId = this.getProjectId(owner, repo);
      const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions?per_page=100`;
      const response = await this.fetchWithAuth(url);
      if (!response.ok) return null;

      const discussions = await response.json() as Array<{
        id: string;
        notes: Array<{ body: string }>;
      }>;

      for (const discussion of discussions) {
        for (const note of discussion.notes) {
          const fp = extractFingerprintFromMarker(note.body);
          if (fp === fingerprint) return discussion.id;
        }
      }
    } catch (err) {
      logger.scan.warn('GitLab: findDiscussionIdByFingerprint failed', { fingerprint, error: (err as Error).message });
    }
    return null;
  }

  /**
   * Get list of files changed in a MR with line-level diff info.
   * GitLab API: GET /projects/:id/merge_requests/:mrIid/changes
   */
  async getPrChangedFiles(owner: string, repo: string, mrIid: number): Promise<ChangedFile[]> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/changes?per_page=100`;

    logger.scan.info('GitLab: getting MR changed files', { owner, repo, mrIid });

    const response = await this.fetchWithAuth(url);

    if (!response.ok) {
      const errorText = await response.text();
      logger.scan.warn('GitLab: get MR changes failed', { status: response.status, error: errorText });
      return [];
    }

    const data = await response.json() as {
      changes?: Array<{
        new_path: string;
        new_file?: boolean;
        renamed_file?: boolean;
        deleted_file?: boolean;
        diff?: string;
      }>;
    };

    const changedFiles: ChangedFile[] = [];

    for (const change of data.changes ?? []) {
      if (change.deleted_file) continue;

      const changedLines = change.diff ? parsePatchToChangedLines(change.diff) : [];

      changedFiles.push({
        filePath: change.new_path,
        changedLines,
      });
    }

    logger.scan.info('GitLab: MR changed files retrieved', { owner, repo, mrIid, fileCount: changedFiles.length });

    return changedFiles;
  }

}

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
import type { ScmApiService, ScmCredentials, CommitStatus, InlineReviewComment } from './scm-api.service';

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

  constructor(credentials: ScmCredentials) {
    // GitLab API: https://gitlab.com/api/v4 or custom URL
    this.baseUrl = credentials.baseUrl.replace(/\/+$/, '');
    this.token = credentials.token;
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token,
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

    const response = await fetch(url, {
      headers: {
        'PRIVATE-TOKEN': this.token,
      },
    });

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

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token,
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
   */
  async postOrUpdatePrComment(
    owner: string,
    repo: string,
    prNumber: number,
    scanId: string,
    body: string,
  ): Promise<'created' | 'updated'> {
    const existingNoteId = await this.findPrComment(owner, repo, prNumber, scanId);

    if (existingNoteId) {
      await this.updatePrComment(owner, repo, prNumber, existingNoteId, body);
      return 'updated';
    }

    await this.postPrComment(owner, repo, prNumber, body);
    return 'created';
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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'PRIVATE-TOKEN': this.token,
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
    let updated = 0;

    for (const comment of comments) {
      try {
        const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/discussions`;

        logger.scan.info('GitLab: posting inline review comment', {
          owner, repo, mrIid, path: comment.filePath, line: comment.lineNumber,
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'PRIVATE-TOKEN': this.token,
          },
          body: JSON.stringify({
            body: comment.body,
            position: {
              position_type: 'text',
              new_path: comment.filePath,
              new_line: comment.lineNumber,
              base_sha: await this.getMrBaseSha(owner, repo, mrIid),
              head_sha: await this.getMrHeadSha(owner, repo, mrIid),
              start_sha: await this.getMrStartSha(owner, repo, mrIid),
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

    return { created, updated };
  }

  /**
   * Delete inline review comments from a previous scan.
   */
  async deleteInlineReviewComments(
    owner: string,
    repo: string,
    mrIid: number,
    scanId: string,
  ): Promise<number> {
    const projectId = this.getProjectId(owner, repo);
    let deleted = 0;

    try {
      const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes?per_page=100`;
      const response = await fetch(url, {
        headers: { 'PRIVATE-TOKEN': this.token },
      });

      if (!response.ok) return 0;

      const notes = await response.json() as Array<{ id: number; body: string }>;
      const scanIdShort = scanId.substring(0, 8);

      for (const note of notes) {
        if (note.body.includes(`Scan: \`${scanIdShort}\``)) {
          const deleteUrl = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}/notes/${note.id}`;
          await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 'PRIVATE-TOKEN': this.token },
          });
          deleted++;
        }
      }
    } catch (err) {
      logger.scan.warn('GitLab: failed to delete inline comments', { error: (err as Error).message });
    }

    return deleted;
  }

  /**
   * Get MR base SHA for posting review comments.
   */
  private async getMrBaseSha(owner: string, repo: string, mrIid: number): Promise<string> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.token },
    });

    if (!response.ok) {
      throw new AppError(`GitLab: failed to get MR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const mr = await response.json() as { diff_refs: { base_sha: string } };
    return mr.diff_refs?.base_sha || '';
  }

  /**
   * Get MR head SHA for posting review comments.
   */
  private async getMrHeadSha(owner: string, repo: string, mrIid: number): Promise<string> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.token },
    });

    if (!response.ok) {
      throw new AppError(`GitLab: failed to get MR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const mr = await response.json() as { diff_refs: { head_sha: string } };
    return mr.diff_refs?.head_sha || '';
  }

  /**
   * Get MR start SHA for posting review comments.
   */
  private async getMrStartSha(owner: string, repo: string, mrIid: number): Promise<string> {
    const projectId = this.getProjectId(owner, repo);
    const url = `${this.baseUrl}/api/v4/projects/${projectId}/merge_requests/${mrIid}`;
    const response = await fetch(url, {
      headers: { 'PRIVATE-TOKEN': this.token },
    });

    if (!response.ok) {
      throw new AppError(`GitLab: failed to get MR info`, 502, HTTP.ERROR_CODES.SCM_ERROR);
    }

    const mr = await response.json() as { diff_refs: { start_sha: string } };
    return mr.diff_refs?.start_sha || '';
  }
}

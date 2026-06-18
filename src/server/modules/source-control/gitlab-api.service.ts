/**
 * GitLab API Service
 *
 * Implements ScmApiService for GitLab.
 * Uses GitLab API v4 for MR notes (comments) and commit statuses.
 *
 * @module source-control/gitlab-api
 */

import { logger } from '@/server/lib/logger';
import type { ScmApiService, ScmCredentials, CommitStatus } from './scm-api.service';

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
      throw new Error(`GitLab MR note failed: ${response.status} ${errorText}`);
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
      throw new Error(`GitLab update MR note failed: ${response.status} ${errorText}`);
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
      throw new Error(`GitLab commit status failed: ${response.status} ${errorText}`);
    }

    logger.scan.info('GitLab: commit status created', { owner, repo, sha, status: status.status });
  }
}

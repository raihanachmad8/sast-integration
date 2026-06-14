import { createPrivateKey, createSign } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { repositories, sourceControls } from '@drizzle/schema/source-controls';
import { sourceControlRepository } from './source-control.repository';
import { createSourceControlSchema, updateSourceControlSchema } from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { logger } from '@/server/lib/logger';
import type { SourceControl } from '@drizzle/schema/source-controls';
import type { CredentialMap, DiscoveredRepository } from './helpers';

/**
 * Sanitize source control credentials for frontend response.
 * Never expose: token, refreshToken, clientSecret, privateKey, webhookSecret
 */
function sanitizeCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['token', 'refreshToken', 'clientSecret', 'privateKey', 'webhookSecret'];
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(credentials)) {
    if (sensitiveKeys.includes(key)) {
      sanitized[key] = typeof value === 'string' && value.length > 8
        ? `${value.substring(0, 4)}****${value.substring(value.length - 4)}`
        : '****';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Service responsible for managing Source Control providers.
 *
 * Supports GitHub (OAuth + App), GitLab, and Gitea providers.
 * Handles OAuth flow, repository discovery, and connection management.
 */
export const sourceControlService = {
  /**
   * Lists all source control providers for a workspace.
   */
  async list(workspaceId: string) {
    logger.sourceControl.info('list', { workspaceId });
    const result = await sourceControlRepository.listByWorkspace(workspaceId);
    logger.sourceControl.info('list completed', { count: result.length });
    return result.map(r => ({
      ...r,
      credentials: r.credentials ? sanitizeCredentials(r.credentials as Record<string, unknown>) : r.credentials,
    }));
  },

  /**
   * Retrieves a single source control provider by ID within a workspace.
   */
  async getById(id: string, workspaceId: string) {
    logger.sourceControl.info('getById', { id, workspaceId });
    const control = await sourceControlRepository.getById(id, workspaceId);
    if (!control) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    logger.sourceControl.info('getById completed', { id });
    return {
      ...control,
      credentials: control.credentials ? sanitizeCredentials(control.credentials as Record<string, unknown>) : control.credentials,
    };
  },

  /**
   * Retrieves raw credentials for internal server-side use (CI/CD API calls).
   * NEVER return this to frontend — credentials are sanitized in getById/list.
   */
  async getCredentialsForInternalUse(workspaceId: string): Promise<{ baseUrl: string; token: string } | null> {
    const [sourceControl] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspaceId, workspaceId))
      .limit(1);

    if (!sourceControl?.credentials) return null;

    const credentials = sourceControl.credentials as Record<string, unknown>;
    const baseUrl = stringValue(credentials.baseUrl);
    const token = stringValue(credentials.token);

    if (!baseUrl || !token) return null;

    return { baseUrl, token };
  },

  /**
   * Creates a new source control provider for a workspace.
   */
  async create(data: unknown, workspaceId: string, userId: string) {
    logger.sourceControl.info('create', { workspaceId });
    const parsed = createSourceControlSchema.parse(data);

    const result = await sourceControlRepository.create({
      workspaceId: workspaceId,
      provider: parsed.provider,
      name: parsed.name,
      credentials: parsed.credentials as Record<string, unknown> | undefined,
      createdBy: userId,
    });
    logger.sourceControl.info('create completed', { controlId: result.id });
    return result;
  },

  /**
   * Updates an existing source control provider.
   */
  async update(id: string, data: unknown, workspaceId: string, _userId: string) {
    logger.sourceControl.info('update', { id, workspaceId });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }
    const parsed = updateSourceControlSchema.parse(data);

    const existingCredentials = toCredentials(existing.credentials);
    const newCredentials = (parsed.credentials as Record<string, unknown>) ?? {};
    const mergedCredentials: Record<string, unknown> = { ...existingCredentials };
    for (const [key, value] of Object.entries(newCredentials)) {
      if (value !== undefined && value !== null && String(value).trim().length > 0) {
        mergedCredentials[key] = value;
      }
    }

    const updated = await sourceControlRepository.update(id, {
      provider: parsed.provider,
      name: parsed.name,
      credentials: mergedCredentials,
    });
    logger.sourceControl.info('update completed', { id });
    return updated;
  },

  /**
   * Deletes a source control provider — cascades uninstall of all imported repos.
   */
  async delete(id: string, workspaceId: string, userId: string) {
    logger.sourceControl.info('delete', { id, workspaceId });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }

    // Cascade: uninstall all imported repos under this connection
    const { sourceControlImportService } = await import('./source-control-import.service');
    await sourceControlImportService.uninstallByConnectionId(userId, id);

    // Delete source_control_repositories
    const { sourceControlRepositoryService } = await import('./source-control-repository.service');
    await sourceControlRepositoryService.deleteByConnectionId(id);

    // Delete the source_controls record
    await sourceControlRepository.delete(id);
    logger.sourceControl.info('delete completed', { id });
    return existing;
  },

  /**
   * Tests the connection to a source control provider.
   * Returns configured credential keys for validation.
   */
  async testConnection(id: string, workspaceId: string) {
    logger.sourceControl.info('testConnection', { id, workspaceId });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }

    const credentials = toCredentials(existing.credentials);
    const configuredKeys = Object.entries(credentials)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0)
      .map(([key]) => key);

    logger.sourceControl.info('testConnection completed', { id, configuredKeys });
    return {
      provider: existing.provider,
      name: existing.name,
      configured: configuredKeys.length > 0,
      configuredKeys,
    };
  },

  /**
   * Discovers remote repositories and returns sync summary.
   */
  async sync(id: string, workspaceId: string) {
    logger.sourceControl.info('sync', { id, workspaceId });
    const existing = await sourceControlRepository.getById(id, workspaceId);
    if (!existing) {
      throw new AppError('Source control provider not found', 404, 'NOT_FOUND');
    }

    logger.sourceControl.info('sync discovering repos', { provider: existing.provider, name: existing.name });
    const discovered = await discoverRepositories(id, existing);
    logger.sourceControl.info('sync discovered repos', { count: discovered.length, repos: discovered.map(r => r.name) });

    // Upsert discovered repos to source_control_repositories table
    const { sourceControlRepositoryService } = await import('./source-control-repository.service');
    await sourceControlRepositoryService.upsertMany(id, workspaceId, discovered);

    logger.sourceControl.info('sync completed', { id, discovered: discovered.length });
    return {
      provider: existing.name,
      discovered: discovered.length,
      repos: discovered.length,
      imported: 0,
      newWebhooks: 0,
    };
  },

  /**
   * Builds the external authorization or installation URL.
   */
  buildRedirectUrl(sourceControl: SourceControl | null, workspaceId: string, origin: string, returnTo?: string | null) {
    if (!sourceControl) return null;
    const credentials = toCredentials(sourceControl.credentials);
    const mode = stringValue(credentials.mode);
    const callbackUrl = `${origin}/api/v1/source-control/callback/${sourceControl.provider}`;
    const state = new URLSearchParams({
      workspaceId,
      sourceControlId: sourceControl.id,
      provider: sourceControl.provider,
      ...(returnTo && { returnTo }),
    }).toString();

    if (sourceControl.provider === 'github' && mode === 'github-app') {
      const appSlug = stringValue(credentials.appSlug);
      if (!appSlug) return null;
      return `https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new?state=${encodeURIComponent(state)}`;
    }

    if (mode !== 'oauth-app') return null;

    const clientId = stringValue(credentials.clientId);
    if (!clientId) return null;

    if (sourceControl.provider === 'github') {
      const url = new URL('https://github.com/login/oauth/authorize');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl);
      url.searchParams.set('scope', 'repo read:org');
      url.searchParams.set('state', state);
      return url.toString();
    }

    if (sourceControl.provider === 'gitlab') {
      const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');
      const url = new URL('/oauth/authorize', baseUrl);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('scope', 'read_api read_repository');
      url.searchParams.set('state', state);
      return url.toString();
    }

    if (sourceControl.provider === 'gitea') {
      const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));
      if (!baseUrl) return null;
      const url = new URL('/login/oauth/authorize', baseUrl);
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl);
      url.searchParams.set('response_type', 'code');
      url.searchParams.set('state', state);
      return url.toString();
    }

    return null;
  },

  /**
   * Handles OAuth/App callback — exchanges code for token and stores it.
   */
  async finalizeCallback(provider: string, sourceControlId: string, input: { code?: string | null; installationId?: string | null; origin: string }) {
    logger.sourceControl.info('finalizeCallback', { provider, sourceControlId });
    const existing = await sourceControlRepository.getByIdRaw(sourceControlId);
    if (!existing || existing.provider !== provider) {
      return null;
    }

    const credentials = toCredentials(existing.credentials);
    const tokenResult = input.code
      ? await exchangeOAuthCode(provider, credentials, input.code, input.origin)
      : null;

    const updated = await sourceControlRepository.update(sourceControlId, {
      credentials: {
        ...credentials,
        ...(tokenResult && typeof tokenResult === 'object' && { token: tokenResult.accessToken }),
        ...(tokenResult && typeof tokenResult === 'object' && tokenResult.refreshToken && { refreshToken: tokenResult.refreshToken }),
        ...(tokenResult && typeof tokenResult === 'object' && tokenResult.expiresIn && { tokenExpiresAt: Date.now() + tokenResult.expiresIn * 1000 }),
        ...(input.installationId && { installationId: input.installationId }),
      },
    });

    logger.sourceControl.info('finalizeCallback — token stored, auto-syncing', { sourceControlId });
    let syncResult = null;
    try {
      syncResult = await this.sync(sourceControlId, existing.workspaceId);
    } catch (e) {
      logger.sourceControl.error('finalizeCallback — auto-sync failed', { sourceControlId, error: e instanceof Error ? e.message : e });
    }

    logger.sourceControl.info('finalizeCallback completed', { sourceControlId });
    return { ...updated, syncResult };
  },

  /**
   * List branches for a repository from its SCM provider.
   * Looks up the source control connection via sourceControlImports.
   *
   * @param repositoryId - Repository UUID
   * @param workspaceId - Workspace UUID for authorization
   * @returns Array of branch names, or empty array if not connected
   */
  async listBranches(repositoryId: string, workspaceId: string): Promise<string[]> {
    logger.sourceControl.info('listBranches', { repositoryId, workspaceId });

    // Find the source control import for this repository
    const importRecord = await sourceControlRepository.findImportByRepositoryId(repositoryId, workspaceId);
    if (!importRecord) {
      logger.sourceControl.info('listBranches — no SCM connection found', { repositoryId });
      return [];
    }

    // Get the source control provider
    const sourceControl = await sourceControlRepository.getById(importRecord.sourceControlId, workspaceId);
    if (!sourceControl) {
      logger.sourceControl.info('listBranches — source control not found', { repositoryId });
      return [];
    }

    const credentials = toCredentials(sourceControl.credentials);
    const token = stringValue(credentials.token);
    const repoFullName = importRecord.fullName || importRecord.name;

    try {
      const branches = await fetchBranches(sourceControl.provider, credentials, token, repoFullName);
      logger.sourceControl.info('listBranches completed', { repositoryId, count: branches.length });
      return branches;
    } catch (error) {
      logger.sourceControl.error('listBranches failed', { repositoryId, error: error instanceof Error ? error.message : String(error) });
      return [];
    }
  },
};

// ── Repository Discovery ──────────────────────────────────────

async function discoverRepositories(sourceControlId: string, sourceControl: SourceControl): Promise<DiscoveredRepository[]> {
  const credentials = toCredentials(sourceControl.credentials);
  const mode = stringValue(credentials.mode);
  const token = stringValue(credentials.token);

  logger.sourceControl.info('discoverRepositories', { provider: sourceControl.provider, mode, hasToken: !!token, credentialKeys: Object.keys(credentials) });

  if (sourceControl.provider === 'github') {
    if (mode === 'github-app') return discoverGitHubAppRepositories(credentials);
    if (token) return discoverGitHubRepositories(credentials, token);
    logger.sourceControl.warn('discoverRepositories: no token for github', { mode });
    return [];
  }
  if (sourceControl.provider === 'gitlab') {
    if (!token) {
      logger.sourceControl.warn('discoverRepositories: no token for gitlab');
      return [];
    }
    return discoverGitLabRepositories(credentials, token);
  }
  if (sourceControl.provider === 'gitea') {
    if (!token) {
      logger.sourceControl.warn('discoverRepositories: no token for gitea');
      return [];
    }
    return discoverGiteaRepositories(sourceControlId, credentials, token);
  }
  return [];
}

async function discoverGitHubAppRepositories(credentials: CredentialMap) {
  const token = await createGitHubInstallationAccessToken(credentials);
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || 'https://api.github.com');
  const payload = await fetchJson<{ repositories?: Array<Record<string, unknown>> }>(
    new URL('/installation/repositories?per_page=100', apiUrl).toString(),
    { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  );
  return (payload.repositories ?? []).map((row) => ({
    name: stringValue(row.full_name) || stringValue(row.name),
    url: stringValue(row.clone_url) || stringValue(row.html_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
  })).filter(hasRepositoryIdentity);
}

async function createGitHubInstallationAccessToken(credentials: CredentialMap) {
  const appId = stringValue(credentials.appId);
  const privateKey = normalizePrivateKey(stringValue(credentials.privateKey));
  const installationId = stringValue(credentials.installationId);
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || 'https://api.github.com');

  if (!appId || !privateKey || !installationId) {
    throw new AppError('GitHub App installation is missing app ID, private key, or installation ID.', 400, 'SOURCE_CONTROL_GITHUB_APP_NOT_CONFIGURED');
  }

  const jwt = buildGitHubAppJwt(appId, privateKey);
  const payload = await fetchJson<{ token?: string }>(
    new URL(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, apiUrl).toString(),
    { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    'POST',
  );

  const installationToken = stringValue(payload.token);
  if (!installationToken) {
    throw new AppError('GitHub installation access token response is invalid.', 502, 'SOURCE_CONTROL_PROVIDER_INVALID_RESPONSE');
  }
  return installationToken;
}

function buildGitHubAppJwt(appId: string, privateKey: string) {
  const issuedAt = Math.floor(Date.now() / 1000) - 30;
  const expiresAt = issuedAt + 9 * 60;
  const header = encodeBase64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({ iat: issuedAt, exp: expiresAt, iss: appId }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const signature = signer.sign(createPrivateKey(privateKey));
  return `${header}.${payload}.${encodeBase64Url(signature)}`;
}

async function discoverGitHubRepositories(credentials: CredentialMap, token: string) {
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || 'https://api.github.com');
  const org = stringValue(credentials.org);
  const path = org
    ? `/orgs/${encodeURIComponent(org)}/repos?per_page=100&type=all&sort=updated`
    : '/user/repos?per_page=100&affiliation=owner,collaborator,organization_member&sort=updated';
  const rows = await fetchJson<Array<Record<string, unknown>>>(new URL(path, apiUrl).toString(), {
    Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28',
  });
  return rows.map((row) => ({
    name: stringValue(row.full_name) || stringValue(row.name),
    url: stringValue(row.clone_url) || stringValue(row.html_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
    externalId: String(row.id || row.full_name || row.name),
  })).filter(hasRepositoryIdentity);
}

async function discoverGitLabRepositories(credentials: CredentialMap, token: string) {
  const baseUrl = stringValue(credentials.baseUrl);
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || (baseUrl ? `${baseUrl}/api/v4` : 'https://gitlab.com/api/v4'));
  const rows = await fetchJson<Array<Record<string, unknown>>>(
    `${apiUrl}projects?membership=true&per_page=100&simple=true&order_by=last_activity_at`,
    { 'PRIVATE-TOKEN': token },
  );
  return rows.map((row) => ({
    name: stringValue(row.path_with_namespace) || stringValue(row.name),
    url: stringValue(row.http_url_to_repo) || stringValue(row.web_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
    externalId: String(row.id || row.path_with_namespace || row.name),
  })).filter(hasRepositoryIdentity);
}

async function discoverGiteaRepositories(sourceControlId: string, credentials: CredentialMap, token: string): Promise<DiscoveredRepository[]> {
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || stringValue(credentials.baseUrl));
  if (!apiUrl) return [];

  try {
    const rows = await fetchJson<Array<Record<string, unknown>>>(new URL('/api/v1/user/repos', apiUrl).toString(), {
      Authorization: `token ${token}`,
    });
    return rows.map((row) => ({
      name: stringValue(row.full_name) || stringValue(row.name),
      url: stringValue(row.clone_url) || stringValue(row.html_url),
      defaultBranch: stringValue(row.default_branch) || 'main',
    })).filter(hasRepositoryIdentity);
  } catch (e) {
    // If 401, try to refresh token
    if (e instanceof AppError && e.statusCode === 401) {
      logger.sourceControl.info('discoverGiteaRepositories: token expired, attempting refresh', { sourceControlId });
      const refreshed = await refreshGiteaToken(credentials);
      if (refreshed) {
        // Update stored credentials with new token
        const { sourceControlRepository: repoService } = await import('./source-control.repository');
        await repoService.update(sourceControlId, {
          credentials: {
            ...credentials,
            token: refreshed.accessToken,
            refreshToken: refreshed.refreshToken,
            tokenExpiresAt: Date.now() + (refreshed.expiresIn || 3600) * 1000,
          },
        });

        // Retry with new token
        const rows = await fetchJson<Array<Record<string, unknown>>>(new URL('/api/v1/user/repos', apiUrl).toString(), {
          Authorization: `token ${refreshed.accessToken}`,
        });
        return rows.map((row) => ({
          name: stringValue(row.full_name) || stringValue(row.name),
          url: stringValue(row.clone_url) || stringValue(row.html_url),
          defaultBranch: stringValue(row.default_branch) || 'main',
          externalId: String(row.id || row.full_name || row.name),
        })).filter(hasRepositoryIdentity);
      }
    }
    throw e;
  }
}

// ── OAuth ──────────────────────────────────────────────────────

async function exchangeOAuthCode(provider: string, credentials: CredentialMap, code: string, origin: string) {
  const clientId = stringValue(credentials.clientId);
  const clientSecret = stringValue(credentials.clientSecret);
  const callbackUrl = `${origin}/api/v1/source-control/callback/${provider}`;

  if (!clientId || !clientSecret) {
    throw new AppError('OAuth client ID and client secret are required.', 400, 'SOURCE_CONTROL_OAUTH_NOT_CONFIGURED');
  }

  if (provider === 'github') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://github.com');
    const payload = await postForm<{ access_token?: string }>(new URL('/login/oauth/access_token', baseUrl).toString(), {
      client_id: clientId, client_secret: clientSecret, code, redirect_uri: callbackUrl,
    }, { Accept: 'application/json' });
    const accessToken = stringValue(payload.access_token);
    if (accessToken) return accessToken;
  }

  if (provider === 'gitlab') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');
    const payload = await postForm<{ access_token?: string }>(new URL('/oauth/token', baseUrl).toString(), {
      client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: callbackUrl,
    });
    const accessToken = stringValue(payload.access_token);
    if (accessToken) return accessToken;
  }

  if (provider === 'gitea') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));
    if (!baseUrl) return null;
    const payload = await postJson<{ access_token?: string; refresh_token?: string; expires_in?: number }>(new URL('/login/oauth/access_token', baseUrl).toString(), {
      client_id: clientId, client_secret: clientSecret, code, grant_type: 'authorization_code', redirect_uri: callbackUrl,
    });
    const accessToken = stringValue(payload.access_token);
    if (accessToken) {
      // Store refresh token and expiry for automatic refresh
      return {
        accessToken,
        refreshToken: payload.refresh_token || null,
        expiresIn: payload.expires_in || null,
      };
    }
  }

  throw new AppError('Source control authorization response did not include an access token.', 502, 'SOURCE_CONTROL_PROVIDER_INVALID_RESPONSE');
}

// ── HTTP Helpers ───────────────────────────────────────────────

async function fetchJson<T>(url: string, headers: Record<string, string>, method = 'GET'): Promise<T> {
  const response = await fetch(url, { method, headers, cache: 'no-store' });
  if (!response.ok) {
    const status = response.status;
    const detail = status === 401 ? 'authentication failed (token expired or invalid)' : `provider returned ${status}`;
    throw new AppError(`Source control sync failed: ${detail}`, status === 401 ? 401 : 502, 'SOURCE_CONTROL_SYNC_FAILED');
  }
  return response.json() as Promise<T>;
}

/**
 * Refresh Gitea OAuth token using refresh_token.
 * Returns new tokens or null if refresh fails.
 */
async function refreshGiteaToken(credentials: CredentialMap): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
  const clientId = stringValue(credentials.clientId);
  const clientSecret = stringValue(credentials.clientSecret);
  const refreshToken = stringValue(credentials.refreshToken);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));

  if (!clientId || !clientSecret || !refreshToken || !baseUrl) {
    logger.sourceControl.warn('refreshGiteaToken: missing credentials', { hasClientId: !!clientId, hasClientSecret: !!clientSecret, hasRefreshToken: !!refreshToken, hasBaseUrl: !!baseUrl });
    return null;
  }

  try {
    const payload = await postJson<{ access_token?: string; refresh_token?: string; expires_in?: number }>(
      new URL('/login/oauth/access_token', baseUrl).toString(),
      {
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
    );

    const accessToken = stringValue(payload.access_token);
    if (accessToken) {
      logger.sourceControl.info('refreshGiteaToken: token refreshed');
      return {
        accessToken,
        refreshToken: payload.refresh_token || refreshToken, // Keep old if new not provided
        expiresIn: payload.expires_in || undefined,
      };
    }
  } catch (e) {
    logger.sourceControl.error('refreshGiteaToken: refresh failed', { error: e instanceof Error ? e.message : String(e) });
  }

  return null;
}

async function postForm<T>(url: string, values: Record<string, string>, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(values),
    cache: 'no-store',
  });
  if (!response.ok) {
    const status = response.status;
    const detail = status === 401 ? 'authentication failed' : `provider returned ${status}`;
    throw new AppError(`Source control authorization failed: ${detail}`, status === 401 ? 401 : 502, 'SOURCE_CONTROL_AUTH_FAILED');
  }
  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify(values),
    cache: 'no-store',
  });
  if (!response.ok) {
    const status = response.status;
    const detail = status === 401 ? 'authentication failed' : `provider returned ${status}`;
    throw new AppError(`Source control authorization failed: ${detail}`, status === 401 ? 401 : 502, 'SOURCE_CONTROL_AUTH_FAILED');
  }
  return response.json() as Promise<T>;
}

// ── Utility Functions ──────────────────────────────────────────

function toCredentials(value: unknown): CredentialMap {
  return value && typeof value === 'object' ? value as CredentialMap : {};
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeBaseUrl(value: string) {
  if (!value) return '';
  return value.endsWith('/') ? value : `${value}/`;
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n');
}

function encodeBase64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function hasRepositoryIdentity(repo: DiscoveredRepository) {
  return repo.name.length > 0 && repo.url.length > 0;
}

// ── Branch Listing ──────────────────────────────────────────────

async function fetchBranches(provider: string, credentials: CredentialMap, token: string, repoFullName: string): Promise<string[]> {
  if (provider === 'github') {
    return fetchGitHubBranches(credentials, token, repoFullName);
  }
  if (provider === 'gitlab') {
    return fetchGitLabBranches(credentials, token, repoFullName);
  }
  if (provider === 'gitea') {
    return fetchGiteaBranches(credentials, token, repoFullName);
  }
  return [];
}

async function fetchGitHubBranches(credentials: CredentialMap, token: string, repoFullName: string): Promise<string[]> {
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || 'https://api.github.com');
  const branches: string[] = [];
  let page = 1;

  while (page <= 10) {
    const rows = await fetchJson<Array<Record<string, unknown>>>(
      new URL(`/repos/${repoFullName}/branches?per_page=100&page=${page}`, apiUrl).toString(),
      { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    );
    if (rows.length === 0) break;
    for (const row of rows) {
      const name = stringValue(row.name);
      if (name) branches.push(name);
    }
    if (rows.length < 100) break;
    page++;
  }

  return branches;
}

async function fetchGitLabBranches(credentials: CredentialMap, token: string, repoFullName: string): Promise<string[]> {
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || `${baseUrl}api/v4`);
  const encodedPath = encodeURIComponent(repoFullName);
  const branches: string[] = [];
  let page = 1;

  while (page <= 10) {
    const rows = await fetchJson<Array<Record<string, unknown>>>(
      new URL(`/projects/${encodedPath}/repository/branches?per_page=100&page=${page}`, apiUrl).toString(),
      { Authorization: `Bearer ${token}` },
    );
    if (rows.length === 0) break;
    for (const row of rows) {
      const name = stringValue(row.name);
      if (name) branches.push(name);
    }
    if (rows.length < 100) break;
    page++;
  }

  return branches;
}

async function fetchGiteaBranches(credentials: CredentialMap, token: string, repoFullName: string): Promise<string[]> {
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || stringValue(credentials.baseUrl));
  if (!apiUrl) return [];

  const url = new URL(`/api/v1/repos/${repoFullName}/branches?limit=50&page=1`, apiUrl).toString();

  // Try with token first, fall back to unauthenticated for public repos
  try {
    const rows = await fetchJson<Array<Record<string, unknown>>>(url, { Authorization: `token ${token}` });
    return rows.map((row) => stringValue(row.name)).filter(Boolean);
  } catch {
    // Token expired or invalid — try without auth (works for public repos)
    try {
      const rows = await fetchJson<Array<Record<string, unknown>>>(url, {});
      return rows.map((row) => stringValue(row.name)).filter(Boolean);
    } catch {
      return [];
    }
  }
}

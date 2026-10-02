import { eq } from 'drizzle-orm';
import { createPrivateKey, createSign } from 'crypto';
import { db } from '@/server/db/client';
import { repositories, sourceControls } from '@drizzle/schema/source-controls';
import type { SourceControl } from '@drizzle/schema/source-controls';
import {
  createSourceControlSchema,
  updateSourceControlSchema,
} from '@/commons/schemas';
import { AppError } from '@/server/http/errors';
import { projectRepository } from '@/server/modules/project/repositories/project.repository';

type CredentialMap = Record<string, unknown>;

interface DiscoveredRepository {
  name: string;
  url: string;
  defaultBranch?: string;
}

export const sourceControlService = {
  /**
   * Creates a new source control integration for a workspace.
   */
  async create(workspaceId: string, createdBy: string, input: unknown) {
    const data = createSourceControlSchema.parse(input);

    const [sourceControl] = await db
      .insert(sourceControls)
      .values({
        workspace_id: workspaceId,
        provider: data.provider,
        name: data.name,
        credentials: data.credentials ?? undefined,
        created_by: createdBy,
      })
      .returning();

    return sourceControl;
  },

  /**
   * Retrieves a single source control integration by ID.
   */
  async getById(id: string) {
    const [sourceControl] = await db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.id, id))
      .limit(1);

    return sourceControl ?? null;
  },

  /**
   * Lists all source control integrations belonging to a workspace.
   */
  async listByWorkspace(workspaceId: string) {
    return db
      .select()
      .from(sourceControls)
      .where(eq(sourceControls.workspace_id, workspaceId));
  },

  /**
   * Updates an existing source control integration.
   */
  async update(id: string, input: unknown) {
    const data = updateSourceControlSchema.parse(input);

    const [updated] = await db
      .update(sourceControls)
      .set({
        ...(data.provider && { provider: data.provider }),
        ...(data.name && { name: data.name }),
        ...(data.credentials !== undefined && { credentials: data.credentials }),
      })
      .where(eq(sourceControls.id, id))
      .returning();

    return updated ?? null;
  },

  /**
   * Stores provider callback metadata needed by later repository sync operations.
   */
  async finalizeCallback(provider: string, sourceControlId: string, input: { code?: string | null; installationId?: string | null; origin: string }) {
    const existing = await this.getById(sourceControlId);
    if (!existing || existing.provider !== provider) {
      return null;
    }

    const credentials = toCredentials(existing.credentials);
    const token = input.code
      ? await exchangeOAuthCode(provider, credentials, input.code, input.origin)
      : null;
    const [updated] = await db
      .update(sourceControls)
      .set({
        credentials: {
          ...credentials,
          ...(token && { token }),
          ...(input.installationId && { installationId: input.installationId }),
        },
      })
      .where(eq(sourceControls.id, sourceControlId))
      .returning();

    return updated ?? null;
  },

  /**
   * Validates that a saved source control has enough local configuration to be used.
   */
  async testConnection(id: string, workspaceId: string) {
    const sourceControl = await this.getById(id);
    if (!sourceControl || sourceControl.workspace_id !== workspaceId) {
      return null;
    }

    const credentials = sourceControl.credentials && typeof sourceControl.credentials === 'object'
      ? sourceControl.credentials as Record<string, unknown>
      : {};

    const configuredKeys = Object.entries(credentials)
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim().length > 0)
      .map(([key]) => key);

    return {
      provider: sourceControl.provider,
      name: sourceControl.name,
      configured: configuredKeys.length > 0,
      configuredKeys,
    };
  },

  /**
   * Discovers remote repositories and persists them into the workspace catalog.
   *
   * @throws {AppError} When the upstream source-control provider rejects the sync request.
   */
  async sync(id: string, workspaceId: string, userId: string) {
    const sourceControl = await this.getById(id);
    if (!sourceControl || sourceControl.workspace_id !== workspaceId) {
      return null;
    }

    const discovered = await discoverRepositories(sourceControl);
    for (const repo of discovered) {
      await projectRepository.upsertDiscoveredRepository(sourceControl.id, repo, userId);
    }

    const rows = await projectRepository.listRepositoriesByWorkspace(workspaceId);
    const providerRows = rows.filter((row) => row.source_control_id === id);

    return {
      provider: sourceControl.name,
      repos: providerRows.length,
      imported: providerRows.filter((row) => Boolean(row.project_id)).length,
      newWebhooks: 0,
      connected: providerRows.filter((row) => Boolean(row.webhook_id)).length,
      discovered: discovered.length,
    };
  },

  /**
   * Builds the external authorization or installation URL used after save/connect.
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
   * Deletes a source control integration.
   */
  async delete(id: string) {
    await db
      .update(repositories)
      .set({ source_control_id: null, updated_at: new Date() })
      .where(eq(repositories.source_control_id, id));

    const [deleted] = await db
      .delete(sourceControls)
      .where(eq(sourceControls.id, id))
      .returning();

    return deleted ?? null;
  },
};

async function discoverRepositories(sourceControl: SourceControl): Promise<DiscoveredRepository[]> {
  const credentials = toCredentials(sourceControl.credentials);
  const mode = stringValue(credentials.mode);
  const token = stringValue(credentials.token);

  if (sourceControl.provider === 'github') {
    if (mode === 'github-app') {
      return discoverGitHubAppRepositories(credentials);
    }
    if (token) {
      return discoverGitHubRepositories(credentials, token);
    }
    return [];
  }
  if (sourceControl.provider === 'gitlab') {
    if (!token) return [];
    return discoverGitLabRepositories(credentials, token);
  }
  if (sourceControl.provider === 'gitea') {
    if (!token) return [];
    return discoverGiteaRepositories(credentials, token);
  }

  return [];
}

async function exchangeOAuthCode(provider: string, credentials: CredentialMap, code: string, origin: string) {
  const clientId = stringValue(credentials.clientId);
  const clientSecret = stringValue(credentials.clientSecret);
  const callbackUrl = `${origin}/api/v1/source-control/callback/${provider}`;

  if (!clientId || !clientSecret) {
    throw new AppError(
      'OAuth client ID and client secret are required to finish source control authorization.',
      400,
      'SOURCE_CONTROL_OAUTH_NOT_CONFIGURED'
    );
  }

  if (provider === 'github') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://github.com');
    const payload = await postForm<{ access_token?: string }>(
      new URL('/login/oauth/access_token', baseUrl).toString(),
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
      },
      { Accept: 'application/json' }
    );
    const accessToken = stringValue(payload.access_token);
    if (accessToken) return accessToken;
  }

  if (provider === 'gitlab') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');
    const payload = await postForm<{ access_token?: string }>(
      new URL('/oauth/token', baseUrl).toString(),
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }
    );
    const accessToken = stringValue(payload.access_token);
    if (accessToken) return accessToken;
  }

  if (provider === 'gitea') {
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));
    if (!baseUrl) return null;
    const payload = await postJson<{ access_token?: string }>(
      new URL('/login/oauth/access_token', baseUrl).toString(),
      {
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: callbackUrl,
        grant_type: 'authorization_code',
      }
    );
    const accessToken = stringValue(payload.access_token);
    if (accessToken) return accessToken;
  }

  throw new AppError(
    'Source control authorization response did not include an access token.',
    502,
    'SOURCE_CONTROL_PROVIDER_INVALID_RESPONSE'
  );
}

async function discoverGitHubAppRepositories(credentials: CredentialMap) {
  const token = await createGitHubInstallationAccessToken(credentials);
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || 'https://api.github.com');
  const payload = await fetchJson<{ repositories?: Array<Record<string, unknown>> }>(
    new URL('/installation/repositories?per_page=100', apiUrl).toString(),
    {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
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
    throw new AppError(
      'GitHub App installation is missing app ID, private key, or installation ID.',
      400,
      'SOURCE_CONTROL_GITHUB_APP_NOT_CONFIGURED'
    );
  }

  const jwt = buildGitHubAppJwt(appId, privateKey);
  const payload = await fetchJson<{ token?: string }>(
    new URL(`/app/installations/${encodeURIComponent(installationId)}/access_tokens`, apiUrl).toString(),
    {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    'POST'
  );

  const installationToken = stringValue(payload.token);
  if (!installationToken) {
    throw new AppError(
      'GitHub installation access token response is invalid.',
      502,
      'SOURCE_CONTROL_PROVIDER_INVALID_RESPONSE'
    );
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
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  });

  return rows.map((row) => ({
    name: stringValue(row.full_name) || stringValue(row.name),
    url: stringValue(row.clone_url) || stringValue(row.html_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
  })).filter(hasRepositoryIdentity);
}

async function discoverGitLabRepositories(credentials: CredentialMap, token: string) {
  const baseUrl = stringValue(credentials.baseUrl);
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || (baseUrl ? `${baseUrl}/api/v4` : 'https://gitlab.com/api/v4'));
  const rows = await fetchJson<Array<Record<string, unknown>>>(
    `${apiUrl}projects?membership=true&per_page=100&simple=true&order_by=last_activity_at`,
    { 'PRIVATE-TOKEN': token }
  );

  return rows.map((row) => ({
    name: stringValue(row.path_with_namespace) || stringValue(row.name),
    url: stringValue(row.http_url_to_repo) || stringValue(row.web_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
  })).filter(hasRepositoryIdentity);
}

async function discoverGiteaRepositories(credentials: CredentialMap, token: string) {
  const apiUrl = normalizeBaseUrl(stringValue(credentials.apiUrl) || stringValue(credentials.baseUrl));
  if (!apiUrl) return [];
  const rows = await fetchJson<Array<Record<string, unknown>>>(new URL('/api/v1/user/repos', apiUrl).toString(), {
    Authorization: `token ${token}`,
  });

  return rows.map((row) => ({
    name: stringValue(row.full_name) || stringValue(row.name),
    url: stringValue(row.clone_url) || stringValue(row.html_url),
    defaultBranch: stringValue(row.default_branch) || 'main',
  })).filter(hasRepositoryIdentity);
}

async function fetchJson<T>(url: string, headers: Record<string, string>, method = 'GET'): Promise<T> {
  const response = await fetch(url, { method, headers, cache: 'no-store' });
  if (!response.ok) {
    throw new AppError(`Source control sync failed with ${response.status}`, 502, 'SOURCE_CONTROL_SYNC_FAILED');
  }
  return response.json() as Promise<T>;
}

async function postForm<T>(url: string, values: Record<string, string>, headers: Record<string, string> = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: new URLSearchParams(values),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new AppError(`Source control authorization failed with ${response.status}`, 502, 'SOURCE_CONTROL_AUTH_FAILED');
  }

  return response.json() as Promise<T>;
}

async function postJson<T>(url: string, values: Record<string, string>) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(values),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new AppError(`Source control authorization failed with ${response.status}`, 502, 'SOURCE_CONTROL_AUTH_FAILED');
  }

  return response.json() as Promise<T>;
}

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

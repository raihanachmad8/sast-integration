import { logger } from '@/server/lib/logger';
import { stringValue, normalizeBaseUrl, type CredentialMap } from './helpers';
import { AppError } from '@/server/http/errors';

interface WebhookResult {
  webhookId: string;
  webhookSecret: string;
}

/**
 * Provision a webhook — upsert pattern (PATCH if exists, POST if new).
 */
export async function provisionWebhook(
  provider: string,
  credentials: CredentialMap,
  repoFullName: string,
  webhookUrl: string,
  secret: string,
  existingWebhookId?: string,
): Promise<WebhookResult | null> {
  if (existingWebhookId) {
    try {
      const result = await patchWebhook(provider, credentials, repoFullName, existingWebhookId, webhookUrl, secret);
      if (result) return result;
    } catch (e) {
      if (!isMissingWebhookError(e)) throw e;
      // Webhook was deleted remotely, fall through to create
    }
  }
  return createWebhook(provider, credentials, repoFullName, webhookUrl, secret);
}

function isMissingWebhookError(e: unknown): boolean {
  if (e instanceof Error) return e.message.includes('404') || e.message.includes('Not Found');
  return false;
}

async function patchWebhook(
  provider: string,
  credentials: CredentialMap,
  repoFullName: string,
  webhookId: string,
  webhookUrl: string,
  secret: string,
): Promise<WebhookResult | null> {
  if (provider === 'github') {
    const token = stringValue(credentials.token);
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://github.com');
    const response = await fetch(new URL(`/repos/${repoFullName}/hooks/${webhookId}`, baseUrl).toString(), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { url: webhookUrl, content_type: 'json', secret, insecure_ssl: '0' } }),
    });
    if (!response.ok) return null;
    return { webhookId, webhookSecret: secret };
  }
  if (provider === 'gitea') {
    const token = stringValue(credentials.token);
    const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));
    const response = await fetch(new URL(`/api/v1/repos/${repoFullName}/hooks/${webhookId}`, baseUrl).toString(), {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { url: webhookUrl, content_type: 'json', secret } }),
    });
    if (!response.ok) return null;
    return { webhookId, webhookSecret: secret };
  }
  return null;
}

/**
 * Creates a webhook on the SCM provider for a given repository.
 * Returns the webhook ID and secret for storage in the DB.
 */
export async function createWebhook(
  provider: string,
  credentials: CredentialMap,
  repoFullName: string,
  webhookUrl: string,
  secret: string,
): Promise<WebhookResult | null> {
  logger.sourceControl.info('createWebhook', { provider, repoFullName });

  if (provider === 'github') {
    return createGitHubWebhook(credentials, repoFullName, webhookUrl, secret);
  }
  if (provider === 'gitlab') {
    return createGitLabWebhook(credentials, repoFullName, webhookUrl, secret);
  }
  if (provider === 'gitea') {
    return createGiteaWebhook(credentials, repoFullName, webhookUrl, secret);
  }

  logger.sourceControl.warn('createWebhook: unsupported provider', { provider });
  return null;
}

/**
 * Deletes a webhook from the SCM provider for a given repository.
 */
export async function deleteWebhook(
  provider: string,
  credentials: CredentialMap,
  repoFullName: string,
  webhookId: string,
): Promise<void> {
  logger.sourceControl.info('deleteWebhook', { provider, repoFullName, webhookId });

  if (provider === 'github') {
    await deleteGitHubWebhook(credentials, repoFullName, webhookId);
    return;
  }
  if (provider === 'gitlab') {
    await deleteGitLabWebhook(credentials, repoFullName, webhookId);
    return;
  }
  if (provider === 'gitea') {
    await deleteGiteaWebhook(credentials, repoFullName, webhookId);
    return;
  }

  logger.sourceControl.warn('deleteWebhook: unsupported provider', { provider });
}

// ── GitHub ──────────────────────────────────────────────────────

async function createGitHubWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookUrl: string,
  secret: string,
): Promise<WebhookResult> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://github.com');

  const response = await fetch(new URL(`/repos/${repoFullName}/hooks`, baseUrl).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'web',
      active: true,
      events: ['push', 'pull_request'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
        insecure_ssl: '0',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`GitHub webhook creation failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  const data = await response.json() as { id: number };
  logger.sourceControl.info('createGitHubWebhook completed', { repoFullName, webhookId: data.id });
  return { webhookId: String(data.id), webhookSecret: secret };
}

async function deleteGitHubWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookId: string,
): Promise<void> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://github.com');

  const response = await fetch(new URL(`/repos/${repoFullName}/hooks/${webhookId}`, baseUrl).toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new AppError(`GitHub webhook deletion failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  logger.sourceControl.info('deleteGitHubWebhook completed', { repoFullName, webhookId });
}

// ── GitLab ──────────────────────────────────────────────────────

async function createGitLabWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookUrl: string,
  secret: string,
): Promise<WebhookResult> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');

  // GitLab uses project path for API calls
  const projectId = encodeURIComponent(repoFullName);

  const response = await fetch(new URL(`/api/v4/projects/${projectId}/hooks`, baseUrl).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: webhookUrl,
      push_events: true,
      merge_requests_events: true,
      token: secret,
      enable_ssl_verification: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`GitLab webhook creation failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  const data = await response.json() as { id: number };
  logger.sourceControl.info('createGitLabWebhook completed', { repoFullName, webhookId: data.id });
  return { webhookId: String(data.id), webhookSecret: secret };
}

async function deleteGitLabWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookId: string,
): Promise<void> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl) || 'https://gitlab.com');
  const projectId = encodeURIComponent(repoFullName);

  const response = await fetch(new URL(`/api/v4/projects/${projectId}/hooks/${webhookId}`, baseUrl).toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new AppError(`GitLab webhook deletion failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  logger.sourceControl.info('deleteGitLabWebhook completed', { repoFullName, webhookId });
}

// ── Gitea ───────────────────────────────────────────────────────

async function createGiteaWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookUrl: string,
  secret: string,
): Promise<WebhookResult> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));

  const response = await fetch(new URL(`/api/v1/repos/${repoFullName}/hooks`, baseUrl).toString(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'gitea',
      active: true,
      events: ['push', 'pull_request'],
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new AppError(`Gitea webhook creation failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  const data = await response.json() as { id: number };
  logger.sourceControl.info('createGiteaWebhook completed', { repoFullName, webhookId: data.id });
  return { webhookId: String(data.id), webhookSecret: secret };
}

async function deleteGiteaWebhook(
  credentials: CredentialMap,
  repoFullName: string,
  webhookId: string,
): Promise<void> {
  const token = stringValue(credentials.token);
  const baseUrl = normalizeBaseUrl(stringValue(credentials.baseUrl));

  const response = await fetch(new URL(`/api/v1/repos/${repoFullName}/hooks/${webhookId}`, baseUrl).toString(), {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const body = await response.text();
    throw new AppError(`Gitea webhook deletion failed (${response.status}): ${body}`, 502, 'EXTERNAL_API_ERROR');
  }

  logger.sourceControl.info('deleteGiteaWebhook completed', { repoFullName, webhookId });
}

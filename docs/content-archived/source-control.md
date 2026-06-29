# Source Control Integration

## Supported Providers

| Provider | OAuth | Webhooks | PR Comments | Commit Status |
|----------|-------|----------|-------------|---------------|
| GitHub | Yes | Yes | Yes | Yes |
| GitLab | Yes | Yes | Yes | Yes |
| Gitea | Token | Yes | Yes | Yes |

## Connecting a Provider

### GitHub

1. Go to **Source Control** page
2. Click **Connect GitHub**
3. Authorize the OAuth app
4. Select organization/personal account
5. Done

### GitLab

1. Go to **Source Control** page
2. Click **Connect GitLab**
3. Enter GitLab URL and access token
4. Authorize
5. Done

### Gitea

1. Go to **Source Control** page
2. Click **Connect Gitea**
3. Enter Gitea URL and personal access token
4. Test connection
5. Done

## Repository Import

After connecting a provider:

1. Click **Import Repositories**
2. Browse available repositories
3. Select repositories to import
4. Click **Import**
5. System creates repository records and syncs branches

## Branch Sync

- Automatic sync every 30 minutes
- Manual sync via **Sync** button
- Detects new branches and deletions
- Updates default branch info

## Webhook Events

| Event | Action |
|-------|--------|
| push | Auto-trigger scan on default branch |
| pull_request | Auto-trigger scan on PR branch |
| pull_request.closed | Update finding status |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/source-controls` | List connections |
| POST | `/source-controls` | Connect provider |
| DELETE | `/source-controls/:id` | Disconnect |
| GET | `/source-controls/:id/repos` | List repos |
| POST | `/source-controls/:id/import` | Import repo |
| POST | `/source-controls/:id/sync` | Sync branches |
| POST | `/source-controls/:id/test` | Test connection |

## Feature Flags

| Flag | Default |
|------|---------|
| `integration.github` | true |
| `integration.gitlab` | true |
| `integration.gitea` | true |

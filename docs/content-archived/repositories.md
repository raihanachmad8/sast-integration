# Repositories

## Overview

Repositories connect your code to the scanning platform. Import repositories from GitHub, GitLab, or Gitea for automated security analysis.

## Supported Providers

| Provider | Features |
|----------|----------|
| GitHub | Webhooks, PR comments, commit status |
| GitLab | Webhooks, MR comments, commit status |
| Gitea | Webhooks, PR comments, commit status |

## Repository States

| State | Description |
|-------|-------------|
| `connected` | SCM integration active |
| `syncing` | Branch sync in progress |
| `error` | Connection issue |

## Import Flow

1. Connect SCM provider (OAuth/Token)
2. List available repositories
3. Select repositories to import
4. System creates repository records
5. Initial branch sync

## API Endpoints

### List Repositories

```
GET /api/v1/workspaces/:workspaceId/repositories
```

### Update Repository

```
PATCH /api/v1/workspaces/:workspaceId/repositories/:repoId
```

### List Branches

```
GET /api/v1/workspaces/:workspaceId/repositories/:repoId/branches
```

## Repository Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Repository name |
| full_name | VARCHAR | Provider full name (owner/repo) |
| default_branch | VARCHAR | Default branch name |
| connection_type | VARCHAR | `scm` or `external` |
| source_control_id | UUID | FK to source_controls |
| status | VARCHAR | Connection status |

## External Uploads

For repositories not connected via SCM:

```bash
POST /api/v1/ci/init
{
  "repoName": "my-repo",
  "branch": "main",
  "commit": "abc123"
}
```

The system auto-creates external repository records.

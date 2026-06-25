# API Tokens

## Overview

API tokens authenticate external services (CI/CD pipelines, scripts) against the platform.

## Token Types

| Type | Scope | Use Case |
|------|-------|----------|
| Personal Access Token | Workspace | User API access |
| Project API Token | Project | CI/CD integration |

## Personal Access Tokens

### Creating a Token

1. Go to **Profile** page
2. Click **Generate Token**
3. Enter token name
4. Select expiration
5. Copy token (shown once)

### Using the Token

```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/api/v1/workspaces
```

## Project API Tokens

### Creating a Project Token

1. Go to **Projects** → Select project
2. Click **API Tokens**
3. Click **Generate Token**
4. Enter token name
5. Copy token

### CI/CD Usage

```bash
# Initialize scan
curl -X POST /api/v1/ci/init \
  -H "Authorization: Bearer $PROJECT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"repoName":"my-repo","branch":"main","commit":"abc123"}'

# Upload results
curl -X POST /api/v1/ci/upload \
  -H "Authorization: Bearer $PROJECT_TOKEN" \
  -F "scanId=$SCAN_ID" \
  -F "tool=semgrep" \
  -F "sarif=@results.json"
```

## Token Security

| Practice | Description |
|----------|-------------|
| Store securely | Never commit tokens to code |
| Rotate regularly | Regenerate tokens periodically |
| Minimal scope | Use project tokens for CI/CD |
| Expiration | Set appropriate expiration dates |

## Token Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR | Token name |
| token_hash | VARCHAR | Bcrypt hash of token |
| project_id | UUID | FK (project tokens only) |
| expires_at | TIMESTAMP | Expiration time |
| last_used_at | TIMESTAMP | Last usage |
| created_at | TIMESTAMP | Creation time |

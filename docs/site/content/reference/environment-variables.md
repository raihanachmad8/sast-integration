---
title: Environment Variables
description: Complete environment variable reference
---

# Environment Variables

## Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/sast_db` |
| `JWT_SECRET` | Secret for JWT tokens (min 32 chars) | `<random-32+ chars>` |
| `NODE_ENV` | Environment mode | `development` / `production` |
| `OWNER_EMAIL` | Admin email for initial seed | `admin@domain.com` |
| `OWNER_PASSWORD` | Admin password | `<secure-password>` |

## Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Application port |
| `APP_URL` | `http://localhost:3000` | Server-side app URL |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Client-side app URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Client-side API URL |
| `WORKSPACE_MODE` | `multiple` | `single` or `multiple` |
| `MAIL_PROVIDER` | `console` | `console` or `smtp` |
| `NVD_API_KEY` | — | NVD API key for knowledge base |
| `STORAGE_PROVIDER` | `local` | `local`, `s3`, or `cloudinary` |

## Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_FLAG_SCAN_MANAGED` | `true` | Managed scan feature |
| `FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD` | `true` | External upload feature |
| `FEATURE_FLAG_AI_VERIFICATION` | `true` | AI verification feature |
| `FEATURE_FLAG_QUALITY_GATES` | `true` | Quality gates feature |
| `FEATURE_FLAG_TEAMS` | `true` | Teams feature |
| `FEATURE_FLAG_PROJECTS` | `true` | Projects feature |
| `FEATURE_FLAG_KNOWLEDGE_BASE` | `true` | Knowledge base feature |
| `FEATURE_FLAG_SCHEDULES` | `false` | Scheduled scans feature |
| `FEATURE_FLAG_SOURCE_CONTROL_GITHUB` | `true` | GitHub integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITLAB` | `true` | GitLab integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITEA` | `true` | Gitea integration |
| `FEATURE_FLAG_WEBHOOKS` | `false` | Webhooks feature |
| `FEATURE_FLAG_SCAN_PROFILES` | `true` | Scan profiles feature |
| `FEATURE_FLAG_SCANNER_ENGINES` | `true` | Scanner engines feature |
| `FEATURE_FLAG_AI_MODELS` | `true` | AI models feature |
| `FEATURE_FLAG_REPORTS` | `true` | Reports feature |
| `FEATURE_FLAG_ARENA` | `false` | Arena comparison feature |

## Scanner Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SEMGREP_RULES_DIR` | `./rules/semgrep` | Custom Semgrep rules directory |
| `GITLEAKS_CONFIG_PATH` | — | Custom Gitleaks config file |
| `FLAWFINDER_RULES_DIR` | `./rules/flawfinder` | Custom Flawfinder rules |
| `CPPCHECK_SUPPRESSIONS_PATH` | — | Cppcheck suppressions file |

## Client-Safe (NEXT_PUBLIC_*)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | Client app URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Client API URL |
| `NEXT_PUBLIC_WORKSPACE_MODE` | `multiple` | Workspace mode |
| `NEXT_PUBLIC_FEATURE_FLAG_*` | varies | Feature flags (17 total) |

## Security

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_EXPIRES_IN` | `15m` | Access token expiry |
| `REFRESH_EXPIRES_IN` | `7d` | Refresh token expiry |
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |

## Seeder

| Variable | Default | Description |
|----------|---------|-------------|
| `OWNER_EMAIL` | `owner@sast.local` | Owner email |
| `OWNER_PASSWORD` | `ChangeMe123!` | Owner password |
| `ORG_NAME` | `SAST Organization` | Organization name |
| `ORG_SLUG` | `sast-org` | Organization slug |

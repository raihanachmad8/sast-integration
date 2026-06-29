# Environment Variables

## Server-Side Variables

### Core

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_SECRET` | Yes | — | JWT signing secret |
| `NODE_ENV` | No | `development` | Environment mode |

### Feature Flags (Server)

| Variable | Default | Description |
|----------|---------|-------------|
| `FEATURE_FLAG_SCAN_MANAGED` | `true` | Managed scanning |
| `FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD` | `true` | External CI upload |
| `FEATURE_FLAG_AI_VERIFICATION` | `true` | AI verification |
| `FEATURE_FLAG_QUALITY_GATES` | `true` | Quality gate policies |
| `FEATURE_FLAG_TEAMS` | `true` | Team management |
| `FEATURE_FLAG_PROJECTS` | `true` | Project organization |
| `FEATURE_FLAG_KNOWLEDGE_BASE` | `true` | Knowledge base |
| `FEATURE_FLAG_SCHEDULES` | `false` | Recurring scans |
| `FEATURE_FLAG_SOURCE_CONTROL_GITHUB` | `true` | GitHub integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITLAB` | `true` | GitLab integration |
| `FEATURE_FLAG_SOURCE_CONTROL_GITEA` | `true` | Gitea integration |
| `FEATURE_FLAG_WEBHOOKS` | `false` | Outgoing webhooks |
| `FEATURE_FLAG_SCAN_PROFILES` | `true` | Scan policies |
| `FEATURE_FLAG_SCANNER_ENGINES` | `true` | Scanner configuration |
| `FEATURE_FLAG_AI_MODELS` | `true` | AI model management |
| `FEATURE_FLAG_REPORTS` | `true` | PDF/XLSX reports |
| `FEATURE_FLAG_ARENA` | `false` | AI comparison |

### Scanner

| Variable | Description |
|----------|-------------|
| `SEMGREP_RULES_DIR` | Custom Semgrep rules directory |
| `FLAWFINDER_RULES_DIR` | Custom Flawfinder rules directory |
| `CPPCHECK_SUPPRESSIONS_PATH` | Cppcheck suppressions file |

### Storage

| Variable | Default | Description |
|----------|---------|-------------|
| `STORAGE_PROVIDER` | `local` | `local` or `s3` |
| `STORAGE_PATH` | `./storage` | Local storage path |
| `S3_BUCKET` | — | S3 bucket name |
| `AWS_REGION` | — | S3 region |
| `AWS_ACCESS_KEY_ID` | — | S3 access key |
| `AWS_SECRET_ACCESS_KEY` | — | S3 secret key |

## Client-Side Variables

All client-side feature flags use the `NEXT_PUBLIC_` prefix:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FEATURE_FLAG_TEAMS` | Client teams flag |
| `NEXT_PUBLIC_FEATURE_FLAG_PROJECTS` | Client projects flag |
| `NEXT_PUBLIC_FEATURE_FLAG_KNOWLEDGE_BASE` | Client knowledge base flag |
| `NEXT_PUBLIC_FEATURE_FLAG_SCANNER_ENGINES` | Client scanner engines flag |
| `NEXT_PUBLIC_FEATURE_FLAG_AI_MODELS` | Client AI models flag |
| `NEXT_PUBLIC_FEATURE_FLAG_REPORTS` | Client reports flag |

## CI/CD Variables

| Variable | Description |
|----------|-------------|
| `SAST_API_URL` | Platform API base URL |
| `SAST_PROJECT_TOKEN` | Project API token |
| `SAST_SCAN_ID` | Scan ID from init response |

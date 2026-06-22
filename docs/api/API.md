# API Reference — SAST Integration

Base URL: `/api/v1`
Response Format: `{ success: boolean, message: string, data: T | null, meta: { requestId, timestamp, pagination? }, error?: { code, details } }`

---

## Module Documentation

| Module | File | Description |
|--------|------|-------------|
| Auth | [auth.md](./auth.md) | Authentication, sessions, invitations |
| Workspace | [workspace.md](./workspace.md) | Workspace management |
| Findings | [findings.md](./findings.md) | Finding management, verification, comments |
| Scans | [scans.md](./scans.md) | Scan execution and results |
| Projects | [projects.md](./projects.md) | Project management |
| Repositories | [repositories.md](./repositories.md) | Repository management |
| Teams | [teams.md](./teams.md) | Team management |
| Members | [members.md](./members.md) | Member management |
| Source Controls | [source-controls.md](./source-controls.md) | SCM provider integrations |
| Knowledge Base | [knowledge-base.md](./knowledge-base.md) | Knowledge entries and sources |
| AI Models | [ai-models.md](./ai-models.md) | AI model management |
| Webhooks | [webhooks.md](./webhooks.md) | Webhook configuration |
| Schedules | [schedules.md](./schedules.md) | Scheduled scan management |
| Reports | [reports.md](./reports.md) | Report generation |
| Dashboard | [dashboard.md](./dashboard.md) | Dashboard statistics |
| Settings | [settings.md](./settings.md) | Verification and PR review settings |
| Scanner Engines | [scanner-engines.md](./scanner-engines.md) | Scanner engine configuration |
| Notifications | [notifications.md](./notifications.md) | Notification system |
| Audit Logs | [audit-logs.md](./audit-logs.md) | Audit trail |
| Activity Logs | [activity-logs.md](./activity-logs.md) | Activity tracking |
| Profile | [profile.md](./profile.md) | User profile management |

---

## Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (deletion success) |
| 400 | Bad Request / Validation error |
| 401 | Unauthorized (no token, invalid token, invalid session) |
| 403 | Forbidden (missing permissions, wrong role) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 410 | Gone (expired/used invitation) |
| 422 | Validation failure (field-level errors) |
| 429 | Rate limited |
| 500 | Internal Server Error |

## Permission Matrix

| Resource | View (Member) | Manage (Manager+) | Owner Only |
|----------|--------------|-------------------|------------|
| Workspace | All members | — | Update, Delete |
| Members | All members | Invite, Revoke | Change role |
| Teams | All members | Create, Update | Delete |
| Projects | All members | Create, Update | Delete |
| Repositories | All members | Import, Remove, Attach policy | — |
| Scans | All members | Run, Trigger | — |
| Findings | All members | Triage, Override AI | — |
| Reports | All members | Export | — |
| Schedules | All members | CRUD | — |
| Webhooks | All members | CRUD | — |
| Source Controls | All members | Manage | — |
| Knowledge Base | All members | Manage | — |
| AI Models | All members | Manage | — |
| Audit Log | — | — | All members |

---

**Responses:**
| Code | Description |
|------|-------------|
| 200 | Authentication successful |
| 401 | Invalid credentials |
| 429 | Rate limited |

**Response Data:**
```json
{
  "tokenType": "Bearer",
  "accessToken": "jwt...",
  "expiresAt": "2026-06-06T00:00:00.000Z",
  "expiresIn": 900,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "currentWorkspaceId": "uuid"
  },
  "workspace": { "id": "uuid", "name": "...", "slug": "...", "role": "owner" }
}
```

> **Note:** Refresh token is set as an httpOnly cookie on the response.

---

### POST /auth/refresh
Rotate access + refresh tokens.

**Auth:** Refresh token cookie (required)
**Headers:** `x-refresh-request: 1` (CSRF protection)

**Response Data:**
```json
{
  "tokenType": "Bearer",
  "accessToken": "jwt...",
  "expiresAt": "2026-06-06T00:00:00.000Z",
  "expiresIn": 900
}
```

**Reuse Detection:** If a previously rotated refresh token is presented, the session is deleted and 401 returned.

---

### POST /auth/signout
Invalidate session.

**Auth:** Bearer token

---

### POST /auth/forgot-password
Send password reset email.

**Auth:** None

**Request Body:** `{ "email": "user@example.com" }`

**Response:** Always 200 (neutral — prevents enumeration)

---

### POST /auth/reset-password
Reset password using token.

**Auth:** None

**Request Body:**
```json
{
  "token": "hex-token",
  "password": "NewStr0ng!Pass"
}
```

**Response:**
| Code | Description |
|------|-------------|
| 200 | Password reset successful |
| 410 | Token expired or already used |

---

### GET /auth/verify-email?token=xxx
Verify email address.

**Auth:** None (query param token)

---

### POST /auth/resend-verification
Resend email verification email.

**Auth:** Bearer token

---

### GET /auth/me
Get current user session.

**Auth:** Bearer token

**Response Data:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "currentWorkspaceId": "uuid"
  },
  "workspace": { "id": "uuid", "name": "...", "slug": "...", "role": "owner" }
}
```

---

### GET /auth/sessions
List active sessions (current user).

**Auth:** Bearer token

---

### GET /auth/audit-log
Get audit log entries.

**Auth:** Bearer token

---

### GET /auth/config
Public platform configuration for login/signup pages.

**Auth:** Optional (returns workspaces if authenticated)

**Response Data:**
```json
{
  "workspaceMode": "multiple",
  "workspaces": [{ "id": "uuid", "name": "...", "slug": "..." }]
}
```

---

### POST /auth/invite
Send a workspace invitation.

**Auth:** Bearer token
**Headers:** `x-workspace-id` (workspace UUID)
**Required Role:** Manager+

**Request Body:**
```json
{ "email": "user@example.com", "role": "member" }
```

**Roles:** `manager`, `reviewer`, `member`

---

### POST /auth/invite/accept
Accept a workspace invitation.

**Auth:** None

**Request Body:**
```json
{
  "token": "hex-token",
  "password": "Str0ng!Pass",
  "name": "John Doe"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| 200 | Invitation accepted |
| 410 | Invitation expired or already accepted |

---

## Users

### PATCH /users/me
Switch active workspace.

**Auth:** Bearer token

**Request Body:** `{ "currentWorkspaceId": "uuid" }`

**Response Data:** `{ "currentWorkspaceId": "uuid" }`

---

### POST /users/me/avatar
Upload avatar image.

**Auth:** Bearer token
**Content-Type:** `multipart/form-data`

**Field:** `file` (JPEG, PNG, GIF, WebP; max 2MB)

**Response Data:** `{ "avatarUrl": "https://..." }`

---

### DELETE /users/me/avatar
Remove avatar.

**Auth:** Bearer token

**Response Data:** `{ "avatarUrl": null }`

---

### PUT /users/profile
Update user profile.

**Auth:** Bearer token

**Request Body:**
```json
{
  "name": "John Updated",
  "bio": "Security engineer",
  "timezone": "Asia/Jakarta",
  "language": "en"
}
```

**Response Data:**
```json
{
  "id": "uuid", "name": "...", "email": "...",
  "bio": "...", "timezone": "...", "language": "...", "avatarUrl": null
}
```

---

## Config

### GET /config
Public platform configuration.

**Auth:** None

**Response Data:** `{ "workspaceMode": "multiple" }`

---

## Health

### GET /health
Health check endpoint.

**Auth:** None

**Response Data:** `{ "status": "healthy", "timestamp": "..." }`

---

## Workspaces

### GET /workspaces
List user's workspaces.

**Auth:** Bearer token

**Response Data:** `WorkspaceItem[]`

```json
[{
  "id": "uuid", "name": "My Workspace", "slug": "my-workspace",
  "type": "organization",
  "description": "...", "avatarUrl": null,
  "role": "owner", "joinedAt": "2026-01-01T00:00:00.000Z"
}]
```

---

### POST /workspaces
Create personal workspace.

**Auth:** Bearer token

**Request Body:**
```json
{
  "name": "My Personal Space",
  "slug": "my-space",
  "description": "...",
  "type": "personal"
}
```

**Responses:**
| Code | Description |
|------|-------------|
| 201 | Workspace created |
| 403 | Self-service disabled (single mode) or type != personal |
| 409 | Already has a personal workspace |

---

### GET /workspaces/:id
Get workspace detail.

**Auth:** Bearer token + membership

**Responses:**
| Code | Description |
|------|-------------|
| 200 | Workspace detail with user's role |
| 403 | Not a member |
| 404 | Not found |

---

### PATCH /workspaces/:id
Update workspace. Owner only.

---

### DELETE /workspaces/:id
Soft-delete workspace. Owner only. Cannot delete personal workspace.

---

## Workspace Members

### GET /workspaces/:id/members
List workspace members.

**Auth:** Bearer token + membership

---

### PATCH /workspaces/:id/members/:userId
Change member role. Owner only.

**Request Body:** `{ "role": "manager" }`

**Allowed Roles:** `manager`, `reviewer`, `member`

---

### DELETE /workspaces/:id/members/:userId
Remove member. Manager+.

---

## Workspace Invitations

### GET /workspaces/:id/invitations
List pending invitations. Manager+.

---

### DELETE /workspaces/:id/invitations/:invitationId
Revoke invitation. Manager+.

---

## Workspace Teams

### GET /workspaces/:id/teams
List teams. Member+

### POST /workspaces/:id/teams
Create team. Manager+

**Request Body:**
```json
{
  "name": "Security Team",
  "slug": "security-team",
  "description": "...",
  "memberIds": ["uuid1", "uuid2"]
}
```

### GET /workspaces/:id/teams/:teamId
Get team detail. Member+

### PUT /workspaces/:id/teams/:teamId
Update team. Manager+

**Request Body:** `{ "name": "...", "description": "...", "memberIds": [...] }`

### DELETE /workspaces/:id/teams/:teamId
Soft-delete team. Owner only.

### GET /workspaces/:id/teams/:teamId/members
List team members. Member+

---

## Workspace Projects

### GET /workspaces/:id/projects
List projects. Member+

### POST /workspaces/:id/projects
Create project. Manager+

**Request Body:**
```json
{
  "name": "My App",
  "slug": "my-app",
  "description": "...",
  "lead": "uuid",
  "platform": "web",
  "language": "typescript",
  "teamIds": ["uuid"],
  "memberIds": ["uuid"],
  "repositoryIds": ["uuid"]
}
```

### GET /workspaces/:id/projects/:projectId
Get project detail. Member+

### PATCH /workspaces/:id/projects/:projectId
Update project. Manager+

### DELETE /workspaces/:id/projects/:projectId
Soft-delete project. Owner only.

---

## Project API Tokens

### GET /workspaces/:id/projects/:projectId/api-tokens
List API tokens. Member+

### POST /workspaces/:id/projects/:projectId/api-tokens
Create API token. Manager+

**Request Body:** `{ "name": "CI Token", "permissions": [...], "expiresInDays": 365 }`

**Response Data:**
```json
{ "token": { "id": "uuid", "name": "CI Token", ... }, "rawValue": "sast_p_..." }
```

> **Note:** `rawValue` is only returned on creation — store it immediately.

### DELETE /workspaces/:id/projects/:projectId/api-tokens/:tokenId
Revoke API token. Manager+

---

## Project Repositories

### GET /workspaces/:id/projects/:projectId/repositories
List repositories under a project. Member+

### DELETE /workspaces/:id/projects/:projectId/repositories/:repoId
Soft-delete repository binding. Manager+

### PUT /workspaces/:id/projects/:projectId/repositories/:repoId/policy
Attach scan policy to repository. Manager+

**Request Body:** `{ "policy_id": "uuid" }`

### DELETE /workspaces/:id/projects/:projectId/repositories/:repoId/policy
Detach scan policy from repository. Manager+

### GET /workspaces/:id/projects/:projectId/repositories/:repoId/scans?limit=25
List scans for a repository. Member+

### POST /workspaces/:id/projects/:projectId/repositories/:repoId/scans/run
Trigger managed scan. Member+

**Request Body:** `{ "branch": "main" }`

### PUT /workspaces/:id/projects/:projectId/repositories/:repoId/schedule
Configure scan schedule. Manager+

**Request Body:**
```json
{
  "active": true,
  "cronExpression": "0 6 * * *",
  "timezone": "UTC",
  "branch": "main"
}
```

---

## Workspace Repositories

### GET /workspaces/:id/repositories
List all discovered/imported repositories. Member+

---

## Source Controls

### GET /workspaces/:id/source-controls
List SCM integrations. Member+

### POST /workspaces/:id/source-controls
Create SCM integration. Manager+

**Request Body:**
```json
{
  "provider": "github",
  "name": "GitHub Org",
  "credentials": {}
}
```

**Providers:** `github`, `gitlab`, `gitea`, `bitbucket`, `azure-devops`

### GET /workspaces/:id/source-controls/:providerId
Get SCM integration detail. Member+

### PATCH|PUT /workspaces/:id/source-controls/:providerId
Update SCM integration. Manager+

### DELETE /workspaces/:id/source-controls/:providerId
Delete SCM integration. Manager+

### POST /workspaces/:id/source-controls/:providerId/sync
Trigger sync. Manager+

### POST /workspaces/:id/source-controls/:providerId/test
Test connection. Member+

### POST /workspaces/:id/source-controls/test-event
Validate synthetic SCM event. Manager+

**Request Body:** `{ "eventType": "push" | "pull_request" }`

### GET /source-control/callback/:provider
OAuth callback handler. Redirects back to app.

---

## Schedules

### GET /workspaces/:id/schedules
List schedules. Member+

### POST /workspaces/:id/schedules
Create schedule. Manager+

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "policyId": "uuid",
  "branch": "main",
  "cronExpression": "0 6 * * *",
  "timezone": "UTC",
  "active": true
}
```

### GET /workspaces/:id/schedules/:scheduleId
Get schedule. Member+

### PUT /workspaces/:id/schedules/:scheduleId
Update schedule. Manager+

### DELETE /workspaces/:id/schedules/:scheduleId
Delete schedule. Manager+

---

## Webhooks

### GET /workspaces/:id/webhooks
List webhooks. Member+

### POST /workspaces/:id/webhooks
Create webhook. Manager+

**Request Body:**
```json
{
  "name": "Slack Notifier",
  "url": "https://hooks.slack.com/...",
  "events": ["scan.completed", "finding.critical"],
  "secret": "whsec_...",
  "active": true
}
```

### GET /workspaces/:id/webhooks/:webhookId
Get webhook. Member+

### PUT /workspaces/:id/webhooks/:webhookId
Update webhook. Manager+

### DELETE /workspaces/:id/webhooks/:webhookId
Soft-delete webhook. Manager+

---

## Knowledge Base

### GET /workspaces/:id/knowledge-base
List knowledge entries. Member+

### POST /workspaces/:id/knowledge-base
Create entry. Manager+

**Request Body:**
```json
{
  "sourceId": "uuid",
  "cweId": "CWE-79",
  "title": "XSS Vulnerability",
  "content": "...",
  "severity": "high",
  "remediation": "...",
  "tags": ["xss", "injection"],
  "muted": false,
  "references": [{ "name": "OWASP", "url": "https://..." }]
}
```

### GET /workspaces/:id/knowledge-base/:entryId
Get entry. Member+

### PUT /workspaces/:id/knowledge-base/:entryId
Update entry. Manager+

### DELETE /workspaces/:id/knowledge-base/:entryId
Delete entry. Manager+

---

## Knowledge Sources

### GET /workspaces/:id/knowledge-sources
List sources. Member+

### POST /workspaces/:id/knowledge-sources
Create source. Manager+

**Request Body:**
```json
{
  "name": "NVD Database",
  "type": "nvd",
  "url": "https://..."
}
```

**Types:** `cwe`, `nvd`, `custom`

### GET /workspaces/:id/knowledge-sources/:sourceId
Get source. Member+

### PUT /workspaces/:id/knowledge-sources/:sourceId
Update source. Manager+

### DELETE /workspaces/:id/knowledge-sources/:sourceId
Delete source. Manager+

### POST /workspaces/:id/knowledge-sources/:sourceId/sync
Trigger sync. Manager+

### GET /workspaces/:id/knowledge-sources/:sourceId/backfill
Get backfill status. Member+

### POST /workspaces/:id/knowledge-sources/:sourceId/backfill
Start/resume NVD historical backfill. Manager+

---

## AI Models

### GET /workspaces/:id/model
List AI models. Member+

### POST /workspaces/:id/model
Create model. Manager+

**Request Body:**
```json
{
  "name": "Qwen2.5-Coder",
  "provider": "ollama",
  "base_url": "http://localhost:11434",
  "role": "primary",
  "priority": 1,
  "prompt_preset": "strict"
}
```

**Providers:** `ollama`, `openai`, `anthropic`, `google`, `groq`, `deepseek`, `together`, `openrouter`
**Roles:** `primary`, `fallback`
**Prompt Presets:** `strict`, `balanced`, `custom`

### GET /workspaces/:id/model/:modelId
Get model. Member+

### PUT /workspaces/:id/model/:modelId
Update model. Manager+

### DELETE /workspaces/:id/model/:modelId
Delete model. Manager+

**Response:** 204 No Content

---

## Scans

### GET /scans
List all scans for current user's workspace.

**Auth:** Bearer token

**Query Params:** (none — uses user's current workspace)

**Response Data:** `ScanRow[]`
```json
[{
  "id": "uuid",
  "repository": "my-app",
  "repoSub": "main • Jan 1, 2026",
  "status": "Running" | "Completed" | "Failed",
  "stage": "Done" | "Error" | "Scanning",
  "findings": 42,
  "critical": 3,
  "ai": "Pending",
  "origin": "managed" | "external_upload",
  "provider": null,
  "connectionType": "scm" | "external"
}]
```

---

### GET /scans/:id
Get scan detail with scanner results.

**Auth:** Bearer token

**Response Data:** `ScanDetail`
```json
{
  "id": "uuid",
  "repository": "my-app",
  "branch": "main",
  "commitSha": "abc123",
  "origin": "managed",
  "status": "queued" | "processing" | "completed" | "failed",
  "startedAt": "2026-01-01T00:00:00.000Z",
  "completedAt": "2026-01-01T00:05:00.000Z",
  "durationSeconds": 300,
  "scannerResults": [{
    "scanner": "semgrep",
    "format": "json",
    "fileKey": "scans/uuid/results/semgrep.json",
    "fileSize": 1024,
    "summary": { "total_findings": 10, "critical": 1, "high": 3, ... }
  }],
  "totalFindings": 42,
  "severityBreakdown": { "critical": 3, "high": 8, "medium": 15, "low": 12, "info": 4 },
  "timeline": []
}
```

---

### GET /scans/:id/findings
Get findings for a scan.

**Auth:** Bearer token

**Note:** Returns empty array `[]` — individual findings populated by background parse job.

---

## Findings

### GET /findings?projectId=xxx
List findings with filters.

**Auth:** Bearer token + FINDING_VIEW permission
**Query Params:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | uuid | Yes | Project UUID |
| `scanId` | uuid | No | Filter by scan |
| `status` | string | No | `open`, `fixed`, `false_positive`, `ignored` |
| `severity` | string | No | `critical`, `high`, `medium`, `low`, `info` |
| `scanner` | string | No | Scanner name |
| `assignedTo` | uuid | No | Assigned user UUID |
| `limit` | number | No | Default 50, max 100 |

**Response Data:**
```json
{ "findings": [Finding] }
```

---

### GET /findings/:id
Get single finding with AI verifications.

**Auth:** Bearer token

---

### PATCH /findings/:id/status
Update finding status.

**Auth:** Bearer token + workspace membership

**Request Body:** `{ "status": "open" | "fixed" | "false_positive" | "ignored" }`

**Note:** Records status change in `finding_history` for audit trail.

---

### PATCH /findings/:id/assign
Assign/unassign finding.

**Auth:** Bearer token

**Request Body:** `{ "assignedTo": "uuid" | null }`

---

### POST /findings/:id/verify
Trigger AI verification.

**Auth:** Bearer token

**Request Body:** `{ "modelId": "uuid" }`

**Note:** Currently synchronous; production would enqueue background job.

---

### PUT /findings/bulk
Bulk update findings.

**Auth:** Bearer token

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "payload": {
    "status": "fixed",
    "assignedTo": null
  }
}
```

---

## Scanner Engines

### GET /scanner-engines
List supported scanners with availability.

**Auth:** Bearer token

**Response Data:**
```json
{
  "scanners": [{
    "name": "semgrep",
    "command": "semgrep",
    "format": "json",
    "outputStream": "stdout",
    "isAvailable": true,
    "status": "ready" | "not_installed"
  }]
}
```

---

### GET /scanner-engines/:id/rules
Get rules for a specific scanner.

**Auth:** Bearer token

**Query Params:** (none)

**Response Data:**
```json
{
  "scanner": "semgrep",
  "rulesPath": "/path/to/rules",
  "totalCount": 1500,
  "rules": [...],
  "packs": ["ci", "security-audit"]
}
```

---

## Scan Upload (CI)

### POST /projects/:projectId/scans/upload
Upload scan results from CI pipeline.

**Auth:** Bearer token (user session) OR Project API token with `scans:upload` permission
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branch` | string | Yes | Git branch |
| `commit` | string | Yes | Git commit SHA |
| `repository_url` | string | No | Repository URL |
| `repository_name` | string | No | Repository name |
| `source` | string | No | Default: `ci_upload` |
| `semgrep` | file | No* | Semgrep JSON results |
| `gitleaks` | file | No* | Gitleaks results |
| `flawfinder` | file | No* | Flawfinder results |
| `trivy` | file | No* | Trivy results |
| `cppcheck` | file | No* | Cppcheck results |

\* At least one scanner file is required.

**Response Data:**
```json
{
  "scanId": "uuid",
  "results": [ ... ]
}
```

---

### POST /projects/:projectId/scans/:scanId/reparse
Trigger re-parsing of scan results.

**Auth:** Bearer token + workspace membership

**Response Data:**
```json
{ "scanId": "uuid", "resultsQueued": 5, "status": "processing" }
```

---

## Reports

### POST /reports
Generate a report.

**Auth:** Bearer token + membership

**Request Body:**
```json
{
  "workspaceId": "uuid",
  "projectId": "uuid",
  "type": "ai_verdict_summary" | "detailed_findings" | "executive_summary" | "compliance_export",
  "format": "pdf" | "xlsx" | "csv",
  "title": "Security Report Jan 2026",
  "filters": {}
}
```

### GET /reports?workspaceId=xxx
List reports for a workspace.

**Auth:** Bearer token + membership

---

## Quality Gates

### GET /quality-gates?workspaceId=xxx
Get quality gate config.

**Auth:** Bearer token

### PUT /quality-gates
Update quality gate config.

**Auth:** Bearer token

**Request Body:**
```json
{
  "workspaceId": "uuid",
  "threshold": "critical" | "high" | "medium" | "low",
  "fail_on_critical": true,
  "fail_on_high_tp": true,
  "warn_on_pending": true,
  "require_human_ack": false,
  "pending_behavior": "warn" | "fail" | "ignore"
}
```

### POST /quality-gates/evaluate
Evaluate quality gate for a scan.

**Auth:** Bearer token

**Request Body:** `{ "scanId": "uuid", "workspaceId": "uuid" }`

### GET /quality-gates/results?workspaceId=xxx
List recent quality gate evaluation results.

**Auth:** Bearer token

---

## Findings — Comments

### GET /workspaces/:workspaceId/findings/:findingId/comments
List comments for a finding.

**Auth:** Bearer token
**Required Role:** Member+

**Response Data:**
```json
[
  {
    "id": "uuid",
    "findingId": "uuid",
    "content": "This looks like a true positive",
    "createdAt": "2026-06-15T10:00:00Z",
    "updatedAt": "2026-06-15T10:00:00Z",
    "createdByName": "John Doe",
    "createdByEmail": "john@example.com"
  }
]
```

---

### POST /workspaces/:workspaceId/findings/:findingId/comments
Add a comment to a finding.

**Auth:** Bearer token
**Required Role:** Member+

**Request Body:**
```json
{
  "content": "This looks like a true positive because the input is not validated"
}
```

**Response Data:**
```json
{
  "id": "uuid",
  "findingId": "uuid",
  "content": "This looks like a true positive because the input is not validated",
  "createdAt": "2026-06-15T10:00:00Z"
}
```

---

## Settings — Verification

### GET /workspaces/:workspaceId/settings/verification
Get verification settings for a workspace.

**Auth:** Bearer token
**Required Role:** Owner or Manager

**Response Data:**
```json
{
  "attachKnowledge": true,
  "requireConfidence": true,
  "allowFallback": true,
  "confidenceThreshold": "90",
  "timeout": "90",
  "cweMismatch": "warn"
}
```

---

### PUT /workspaces/:workspaceId/settings/verification
Update verification settings for a workspace.

**Auth:** Bearer token
**Required Role:** Owner or Manager

**Request Body:**
```json
{
  "attachKnowledge": true,
  "requireConfidence": true,
  "allowFallback": false,
  "confidenceThreshold": "95",
  "timeout": "120",
  "cweMismatch": "fail"
}
```

**Response Data:**
```json
{
  "attachKnowledge": true,
  "requireConfidence": true,
  "allowFallback": false,
  "confidenceThreshold": "95",
  "timeout": "120",
  "cweMismatch": "fail"
}
```

---

## Notifications

### GET /notifications
List notifications for the current user.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 20 | Max items (1-200) |
| offset | number | 0 | Pagination offset |

**Response Data:**
```json
[
  {
    "id": "uuid",
    "workspaceId": "uuid",
    "userId": "uuid",
    "type": "scan_completed",
    "description": "Scan completed for repository backend-api",
    "metadata": {},
    "createdAt": "2026-06-15T10:00:00Z"
  }
]
```

---

### GET /notifications/unread-count
Get unread notification count for the current user.

**Auth:** Bearer token

**Response Data:**
```json
{
  "count": 5
}
```

---

## Audit & Activity Logs

### GET /audit-logs
List audit logs for workspaces the user has access to.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 50 | Max items (1-200) |
| offset | number | 0 | Pagination offset |

**Response Data:**
```json
[
  {
    "id": "uuid",
    "workspaceId": "uuid",
    "userId": "uuid",
    "action": "member.invited",
    "resourceType": "member",
    "resourceId": "uuid",
    "data": {},
    "ipAddress": "192.168.1.1",
    "createdAt": "2026-06-15T10:00:00Z"
  }
]
```

---

### GET /activity-logs
List activity logs for workspaces the user has access to.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 50 | Max items (1-200) |
| offset | number | 0 | Pagination offset |

**Response Data:**
```json
[
  {
    "id": "uuid",
    "workspaceId": "uuid",
    "userId": "uuid",
    "type": "scan.completed",
    "description": "Scan completed for repository backend-api",
    "metadata": {},
    "createdAt": "2026-06-15T10:00:00Z"
  }
]
```

---

## Scanner Engines — Rules

### GET /scanner-engines/:scannerId/rules
List available rules for a scanner engine.

**Auth:** Bearer token

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| scannerId | string | Scanner ID (semgrep, gitleaks, flawfinder, cppcheck, clang-tidy, gcc-fanalyzer) |

**Response Data:**
```json
[
  {
    "name": "p/default",
    "description": "Default ruleset for common vulnerabilities",
    "enabled": true
  }
]
```

---

> **Last Updated:** 2026-06-05 — Generated from stash codebase (feature/security-hardening)

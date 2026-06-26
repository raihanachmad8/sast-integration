# API Overview

## Base URL

```
/api/v1
```

All endpoints are prefixed with `/api/v1`. The full URL is:

```
https://your-domain.com/api/v1/{endpoint}
```

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

### Getting a Token

**Sign in:**

```bash
POST /api/v1/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Sign in successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "workspace": {
      "id": "uuid",
      "name": "My Workspace",
      "slug": "my-workspace",
      "role": "owner"
    }
  }
}
```

**Refresh token:**

```bash
POST /api/v1/auth/refresh
Headers: x-refresh-request: 1
```

The refresh token is stored in an HTTP-only cookie and automatically rotates on each use.

## Response Envelope

All responses follow a standard envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
```

**Success example:**

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**Error example:**

```json
{
  "success": false,
  "message": "Validation failed",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

## Endpoint Groups

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/signup` | Create new account | No |
| POST | `/auth/signin` | Sign in with email/password | No |
| POST | `/auth/signout` | Sign out (invalidate session) | Yes |
| POST | `/auth/refresh` | Refresh access token | Cookie |
| GET | `/auth/me` | Get current user session | Yes |

### Workspaces

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces` | List all workspaces for user | — |
| POST | `/workspaces` | Create new workspace | — |
| GET | `/workspaces/:id` | Get workspace details | `WORKSPACE_SETTINGS_VIEW` |
| PUT | `/workspaces/:id` | Update workspace settings | `WORKSPACE_SETTINGS_MANAGE` |
| POST | `/workspaces/switch` | Switch active workspace | — |

### Repositories

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/repositories` | List repositories | `REPOSITORY_VIEW` |
| PATCH | `/workspaces/:id/repositories/:repoId` | Update repository | `REPOSITORY_MANAGE` |
| GET | `/workspaces/:id/repositories/:repoId/branches` | List branches | `REPOSITORY_VIEW` |

### Scans

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/scans` | List scans | `SCAN_VIEW` |
| POST | `/workspaces/:id/scans` | Trigger new scan | `SCAN_RUN` |
| GET | `/workspaces/:id/scans/:scanId` | Get scan details | `SCAN_VIEW` |
| POST | `/workspaces/:id/scans/upload` | Upload scan results (CI) | `SCAN_RUN` |
| GET | `/workspaces/:id/scanners` | List scanner engines | `SCAN_VIEW` |

### Findings

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/findings` | List findings | `SCAN_VIEW` |
| GET | `/workspaces/:id/findings/:findingId` | Get finding details | `SCAN_VIEW` |
| PATCH | `/workspaces/:id/findings/:findingId` | Update finding (triage) | `FINDING_TRIAGE` |
| POST | `/workspaces/:id/findings/:findingId/verify` | Run AI verification | `FINDING_OVERRIDE_AI` |
| PUT | `/workspaces/:id/findings/bulk` | Bulk update findings | `FINDING_TRIAGE` |

### Reports

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/reports` | List reports | `REPORT_VIEW` |
| POST | `/workspaces/:id/reports` | Generate new report | `REPORT_EXPORT` |
| GET | `/workspaces/:id/reports/:reportId` | Get report details | `REPORT_VIEW` |
| GET | `/workspaces/:id/reports/:reportId/download` | Download report file | `REPORT_VIEW` |
| GET | `/workspaces/:id/reports/:reportId/preview` | Preview report | `REPORT_VIEW` |
| DELETE | `/workspaces/:id/reports/:reportId` | Delete report | `REPORT_EXPORT` |

### Members

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/members` | List workspace members | `MEMBER_VIEW` |
| POST | `/workspaces/:id/invitations` | Invite new member | `MEMBER_INVITE` |
| PATCH | `/workspaces/:id/members/:userId` | Update member role | `MEMBER_MANAGE` |
| DELETE | `/workspaces/:id/members/:userId` | Remove member | `MEMBER_MANAGE` |

### Teams

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/teams` | List teams | `TEAM_VIEW` |
| POST | `/workspaces/:id/teams` | Create team | `TEAM_MANAGE` |
| PUT | `/workspaces/:id/teams/:teamId` | Update team | `TEAM_MANAGE` |
| DELETE | `/workspaces/:id/teams/:teamId` | Delete team | `TEAM_MANAGE` |

### Projects

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/projects` | List projects | `PROJECT_VIEW` |
| POST | `/workspaces/:id/projects` | Create project | `PROJECT_MANAGE` |
| GET | `/workspaces/:id/projects/:projectId` | Get project details | `PROJECT_VIEW` |
| PUT | `/workspaces/:id/projects/:projectId` | Update project | `PROJECT_MANAGE` |
| DELETE | `/workspaces/:id/projects/:projectId` | Delete project | `PROJECT_MANAGE` |

### Source Controls

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/source-controls` | List SCM connections | `INTEGRATION_VIEW` |
| POST | `/workspaces/:id/source-controls` | Connect SCM provider | `INTEGRATION_MANAGE` |
| POST | `/workspaces/:id/source-controls/:providerId/sync` | Sync repositories | `INTEGRATION_MANAGE` |
| POST | `/workspaces/:id/source-controls/:providerId/import` | Import repositories | `INTEGRATION_MANAGE` |

### Webhooks

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/webhooks` | List webhooks | `WEBHOOK_VIEW` |
| POST | `/workspaces/:id/webhooks` | Create webhook | `WEBHOOK_MANAGE` |
| DELETE | `/workspaces/:id/webhooks/:webhookId` | Delete webhook | `WEBHOOK_MANAGE` |
| POST | `/workspaces/:id/webhooks/:webhookId/test` | Test webhook | `WEBHOOK_MANAGE` |

### Schedules

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/schedules` | List schedules | `SCHEDULE_VIEW` |
| POST | `/workspaces/:id/schedules` | Create schedule | `SCHEDULE_MANAGE` |
| PUT | `/workspaces/:id/schedules/:scheduleId` | Update schedule | `SCHEDULE_MANAGE` |
| DELETE | `/workspaces/:id/schedules/:scheduleId` | Delete schedule | `SCHEDULE_MANAGE` |
| POST | `/workspaces/:id/schedules/:scheduleId/toggle` | Toggle schedule | `SCHEDULE_MANAGE` |

### Scanner Engines

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/scanners` | List scanner engines | `SCANNER_VIEW` |
| POST | `/workspaces/:id/scanners` | Configure scanner | `SCANNER_MANAGE` |
| GET | `/workspaces/:id/scanners/:scannerId/rules` | List scanner rules | `SCANNER_VIEW` |

### Quality Gates

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/quality-gates` | List quality gates | `POLICY_VIEW` |
| POST | `/quality-gates` | Create quality gate | `POLICY_MANAGE` |

### Knowledge Base

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/knowledge-base` | List knowledge entries | `KNOWLEDGE_VIEW` |
| POST | `/workspaces/:id/knowledge-base` | Create entry | `KNOWLEDGE_MANAGE` |
| PUT | `/workspaces/:id/knowledge-base/:entryId` | Update entry | `KNOWLEDGE_MANAGE` |
| DELETE | `/workspaces/:id/knowledge-base/:entryId` | Delete entry | `KNOWLEDGE_MANAGE` |

### AI Models

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/workspaces/:id/model` | List AI models | `AI_MODEL_VIEW` |
| POST | `/workspaces/:id/model` | Configure AI model | `AI_MODEL_MANAGE` |
| PUT | `/workspaces/:id/model/:modelId` | Update AI model | `AI_MODEL_MANAGE` |
| DELETE | `/workspaces/:id/model/:modelId` | Delete AI model | `AI_MODEL_MANAGE` |
| POST | `/workspaces/:id/model/:modelId/test` | Test AI model | `AI_MODEL_MANAGE` |

### Dashboard

| Method | Endpoint | Description | Permission |
|--------|----------|-------------|------------|
| GET | `/dashboard/stats` | Get dashboard statistics | `DASHBOARD_VIEW` |
| GET | `/dashboard/scans` | Get recent scans | `DASHBOARD_VIEW` |
| GET | `/dashboard/findings` | Get recent findings | `DASHBOARD_VIEW` |
| GET | `/dashboard/health` | System health check | — |

## Error Responses

| Code | Constant | Description |
|------|----------|-------------|
| 400 | `VALIDATION_ERROR` | Request validation failed |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 425 | `NOT_READY` | Resource not ready (e.g., report still generating) |
| 500 | `INTERNAL_ERROR` | Server error |

## Pagination

Most list endpoints support pagination:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-based) |
| `per_page` | integer | 20 | Items per page (max 100) |

**Example:**

```
GET /api/v1/workspaces/abc123/findings?page=2&per_page=50
```

**Response with pagination:**

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 50,
    "total": 237
  }
}
```

## Rate Limiting

| Limit | Window | Scope |
|-------|--------|-------|
| 100 requests | 1 minute | Per user |
| 1000 requests | 1 hour | Per user |

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Webhooks

Webhooks send POST requests to your configured URL when events occur:

| Event | Description |
|-------|-------------|
| `scan.completed` | Scan finished processing |
| `scan.failed` | Scan failed |
| `finding.created` | New finding detected |
| `report.ready` | Report generated |

**Webhook payload:**

```json
{
  "event": "scan.completed",
  "workspace_id": "uuid",
  "data": {
    "scan_id": "uuid",
    "status": "completed",
    "findings_count": 12
  },
  "timestamp": "2026-06-25T10:30:00Z"
}
```

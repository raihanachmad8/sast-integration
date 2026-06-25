# API Overview

## Base URL

```
/api/v1
```

## Authentication

All authenticated endpoints require:

```
Authorization: Bearer <token>
```

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

## Endpoint Groups

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Create account |
| POST | `/auth/signin` | Sign in |
| POST | `/auth/signout` | Sign out |
| POST | `/auth/refresh` | Refresh session |

### Workspaces

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/workspaces` | List workspaces |
| POST | `/workspaces` | Create workspace |
| GET | `/workspaces/:id` | Get workspace |
| PUT | `/workspaces/:id` | Update workspace |

### Repositories

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/repositories` | `REPOSITORY_VIEW` |
| PATCH | `/workspaces/:id/repositories/:repoId` | `REPOSITORY_MANAGE` |
| GET | `/workspaces/:id/repositories/:repoId/branches` | `REPOSITORY_VIEW` |

### Scans

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/scans` | `SCAN_VIEW` |
| POST | `/workspaces/:id/scans` | `SCAN_RUN` |
| GET | `/workspaces/:id/scans/:scanId` | `SCAN_VIEW` |
| POST | `/workspaces/:id/scans/upload` | `SCAN_RUN` |
| GET | `/workspaces/:id/scanners` | `SCAN_VIEW` |

### Findings

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/findings` | `SCAN_VIEW` |
| GET | `/workspaces/:id/findings/:findingId` | `SCAN_VIEW` |
| PATCH | `/workspaces/:id/findings/:findingId` | `FINDING_TRIAGE` |
| POST | `/workspaces/:id/findings/:findingId/verify` | `FINDING_OVERRIDE_AI` |
| PUT | `/workspaces/:id/findings/bulk` | `FINDING_TRIAGE` |

### Reports

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/reports` | `REPORT_VIEW` |
| POST | `/workspaces/:id/reports` | `REPORT_EXPORT` |
| GET | `/workspaces/:id/reports/:reportId/download` | `REPORT_VIEW` |

### Members

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/members` | `MEMBER_VIEW` |
| POST | `/workspaces/:id/invitations` | `MEMBER_INVITE` |
| PATCH | `/workspaces/:id/members/:userId` | `MEMBER_MANAGE` |
| DELETE | `/workspaces/:id/members/:userId` | `MEMBER_MANAGE` |

### Teams

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/teams` | `TEAM_VIEW` |
| POST | `/workspaces/:id/teams` | `TEAM_MANAGE` |
| PUT | `/workspaces/:id/teams/:teamId` | `TEAM_MANAGE` |
| DELETE | `/workspaces/:id/teams/:teamId` | `TEAM_MANAGE` |

### Projects

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/workspaces/:id/projects` | `PROJECT_VIEW` |
| POST | `/workspaces/:id/projects` | `PROJECT_MANAGE` |
| PUT | `/workspaces/:id/projects/:projectId` | `PROJECT_MANAGE` |
| DELETE | `/workspaces/:id/projects/:projectId` | `PROJECT_MANAGE` |

## Error Responses

| Code | Description |
|------|-------------|
| 400 | Validation error |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 404 | Resource not found |
| 409 | Conflict (duplicate resource) |
| 500 | Internal server error |

## Pagination

| Parameter | Default | Description |
|-----------|---------|-------------|
| page | 1 | Page number |
| per_page | 20 | Items per page |

## Rate Limiting

| Limit | Window |
|-------|--------|
| 100 requests | 1 minute |
| 1000 requests | 1 hour |

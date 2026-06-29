# Audit Logs

## Overview

Audit logs track all significant actions in the workspace for compliance and security monitoring.

## Logged Events

| Category | Events |
|----------|--------|
| Auth | Login, logout, signup, password change |
| Workspace | Create, update, delete, member changes |
| Repository | Import, sync, delete |
| Scan | Trigger, complete, fail |
| Finding | Create, status change, assignment, AI verify |
| Report | Generate, download, delete |
| Settings | Update workspace settings, feature flags |

## Audit Log Fields

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| workspace_id | UUID | Workspace scope |
| user_id | UUID | Actor |
| action | VARCHAR | Action type |
| resource_type | VARCHAR | Resource type |
| resource_id | UUID | Resource ID |
| details | JSONB | Action details |
| ip_address | VARCHAR | Client IP |
| user_agent | VARCHAR | Client user agent |
| created_at | TIMESTAMP | When action occurred |

## Querying Audit Logs

### Via UI

1. Go to **Audit Logs** page
2. Filter by:
   - Date range
   - User
   - Action type
   - Resource type
3. Export as CSV

### Via API

```bash
GET /api/v1/audit-logs?from=2026-06-01&to=2026-06-25&action=scan.triggered
```

### Response

```json
{
  "data": [
    {
      "id": "uuid",
      "user": "john@example.com",
      "action": "scan.triggered",
      "resource_type": "scan",
      "resource_id": "uuid",
      "details": { "repository": "my-repo", "branch": "main" },
      "ip_address": "192.168.1.1",
      "created_at": "2026-06-25T10:30:00Z"
    }
  ],
  "total": 150
}
```

## Activity Logs

Lighter-weight logging for UI activity:

```bash
GET /api/v1/activity-logs
```

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/audit-logs` | `AUDIT_VIEW` |
| GET | `/activity-logs` | `AUDIT_VIEW` |

## Retention

| Policy | Default |
|--------|---------|
| Audit logs | 365 days |
| Activity logs | 90 days |

# Schedules

## Overview

Schedules automate recurring scans using cron expressions. Configure scans to run daily, weekly, or on custom schedules.

## Schedule Structure

```typescript
interface Schedule {
  id: string;
  workspace_id: string;
  repository_id: string;
  branch: string;
  cron_expression: string;
  timezone: string;
  active: boolean;
  last_run_at: Date | null;
  next_run_at: Date | null;
  created_by: string;
}
```

## Creating a Schedule

### Via UI

1. Go to **Schedules** page
2. Click **Add Schedule**
3. Select repository and branch
4. Enter cron expression
5. Set timezone
6. Click **Create**

### Via API

```bash
POST /api/v1/workspaces/:workspaceId/schedules
{
  "repositoryId": "uuid",
  "branch": "main",
  "cronExpression": "0 2 * * *",
  "timezone": "UTC"
}
```

## Cron Expressions

| Expression | Description |
|------------|-------------|
| `0 2 * * *` | Daily at 2 AM |
| `0 2 * * 1` | Weekly on Monday at 2 AM |
| `0 2 1 * *` | Monthly on 1st at 2 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 2 * * 1-5` | Weekdays at 2 AM |

## Timezone

Schedules support timezone-aware cron expressions:

```json
{
  "timezone": "America/New_York"
}
```

## Schedule Management

| Action | Endpoint |
|--------|----------|
| List | `GET /schedules` |
| Create | `POST /schedules` |
| Update | `PUT /schedules/:id` |
| Delete | `DELETE /schedules/:id` |
| Toggle | `PUT /schedules/:id/toggle` |

## Feature Flag

Schedules require `FEATURE_FLAG_SCHEDULES=true` (disabled by default).

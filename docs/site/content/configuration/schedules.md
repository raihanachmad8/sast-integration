---
title: Schedules
description: Automated recurring scan schedules
---

# Schedules

## Overview

Schedules automate recurring scans using cron expressions.

## Create Schedule

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant DB[(Database)]

    User->>UI: Click "Add Schedule"
    UI->>API: POST /api/v1/schedules
    API->>DB: INSERT schedule
    API->>DB: Calculate nextRunAt
    API-->>UI: 201 { schedule }
```

## Cron Examples

| Expression | Description |
|-----------|-------------|
| `0 2 * * *` | Daily at 2:00 AM |
| `0 */6 * * *` | Every 6 hours |
| `0 9 * * 1-5` | Weekdays at 9:00 AM |
| `0 0 1 * *` | First day of each month |

## Execution Flow

```mermaid
flowchart TD
    A["trigger-scheduled-managed-scan<br/>worker runs every minute"] --> B["SELECT schedules WHERE<br/>active = true AND nextRunAt <= now()"]
    B --> C{"Due schedules?"}
    C -->|"Yes"| D["Enqueue run-managed-scan"]
    C -->|"No"| E["Sleep until next check"]
    D --> F["UPDATE schedule:<br/>lastRunAt, nextRunAt"]

    style D fill:#4a9eff,color:#fff
```

## Toggle Schedule

```mermaid
sequenceDiagram
    actor User
    participant API
    participant DB[(Database)]

    User->>API: PATCH /api/v1/schedules/:id
    API->>DB: UPDATE schedule SET active = ?
    API-->>User: 200
```

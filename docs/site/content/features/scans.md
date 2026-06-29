---
title: Scans
description: Trigger, monitor, and manage security scans
---

# Scans

## Overview

Scans analyze your code using multiple scanner engines and produce security findings.

## Scan Types

| Type | Trigger | Description |
|------|---------|-------------|
| **Managed** | User action | Triggered from the web UI |
| **External** | CI/CD pipeline | Results uploaded via API |
| **Scheduled** | Cron schedule | Automated recurring scans |

## Scan Lifecycle

```mermaid
stateDiagram-v2
    [*] --> pending: Created
    pending --> queued: Enqueued
    queued --> cloning: Worker starts
    cloning --> scanning: Repo cloned
    scanning --> parsing: Scanners done
    parsing --> ai_verifying: Results parsed
    ai_verifying --> completed: AI done
    ai_verifying --> failed: Error
    completed --> [*]
    failed --> [*]
```

## Trigger Scan

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant Worker
    participant DB[(Database)]

    User->>UI: Click "New Scan"
    UI->>API: POST /api/v1/scans
    API->>DB: INSERT scan (status: pending)
    API->>Worker: Enqueue run-managed-scan
    API-->>UI: 201 { scanId }
    Worker->>DB: UPDATE scan status → queued
```

## Progress Events

Each scan has a timeline of progress events:

| Event | Description |
|-------|-------------|
| `triggered` | Scan initiated |
| `queued` | Added to queue |
| `cloning` | Git clone started |
| `scanning` | Scanners running |
| `parsing` | Parsing results |
| `ai_verifying` | AI verification started |
| `completed` | Scan finished |
| `failed` | Scan failed |

## Scan Detail View

```mermaid
graph TB
    subgraph "Scan Detail"
        Header["Header: repo, branch, status"]
        Timeline["Timeline: stages + duration"]
        Results["Results: findings by severity"]
        Actions["Actions: view findings, re-run"]
    end

    Header --> Timeline --> Results --> Actions
```

## PR Analysis

When scanning a PR, the system tracks:

| Metric | Description |
|--------|-------------|
| `new_findings` | Findings new in this PR |
| `fixed_findings` | Findings fixed in this PR |
| `persistent_findings` | Pre-existing findings |

These metrics are displayed in the scan detail and quality gate evaluation.

## CI/CD Integration

```bash
# Initialize scan
POST /api/v1/scans/upload/init
{
  "repositoryName": "my-repo",
  "branch": "main",
  "commitSha": "abc123"
}

# Upload scanner results
POST /api/v1/scans/upload
FormData: scanId, scanner, file

# Complete scan
POST /api/v1/scans/upload/complete
{
  "scanId": "uuid",
  "status": "completed"
}
```

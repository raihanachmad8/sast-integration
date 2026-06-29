---
title: Repositories
description: Connect and manage code repositories for security scanning
---

# Repositories

## Overview

Repositories connect your code to the scanning platform. Import from GitHub, GitLab, or Gitea for automated security analysis.

## Supported Providers

| Provider | OAuth | Webhooks | PR Comments | Commit Status |
|----------|:-----:|:--------:|:-----------:|:-------------:|
| GitHub | ✅ | ✅ | ✅ | ✅ |
| GitLab | ✅ | ✅ | ✅ | ✅ |
| Gitea | ✅ | ✅ | ✅ | ✅ |

## Repository Management

```mermaid
flowchart TD
    A["Repository"] --> B{"Connection Type?"}
    B -->|"SCM"| C["Connected via GitHub/GitLab/Gitea"]
    B -->|"External"| D["Manual URL entry"]

    C --> E["Auto-sync repos"]
    C --> F["Webhook for auto-scan"]
    C --> G["PR analysis"]

    D --> H["CI/CD upload"]
    D --> I["Manual scan trigger"]

    style C fill:#4a9eff,color:#fff
    style D fill:#f59e0b,color:#fff
```

## Import Flow

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant API
    participant SCM as SCM Provider
    participant DB[(Database)]

    User->>UI: Click "Import Repository"
    UI->>API: POST /api/v1/repositories/import
    API->>DB: INSERT repository
    API->>SCM: Setup webhook (if auto-scan enabled)
    SCM-->>API: Webhook ID
    API->>DB: Store webhook_external_id
    API-->>UI: 201 { repository }
```

## Connection Types

| Type | Description | Scanning Method |
|------|-------------|-----------------|
| `scm` | Connected via GitHub/GitLab/Gitea | Managed scan (git clone) |
| `external` | Manual URL entry | CI/CD upload |

## Auto-Scan

When `auto_scan` is enabled, webhooks trigger scans automatically:

```mermaid
flowchart LR
    A["Git push"] --> B["Webhook fires"]
    B --> C["SAST receives event"]
    C --> D["Enqueue managed scan"]
    D --> E["Scan executes"]

    style A fill:#22c55e,color:#fff
    style E fill:#4a9eff,color:#fff
```

## Repository Fields

| Field | Description |
|-------|-------------|
| `name` | Repository name |
| `url` | Repository URL |
| `default_branch` | Default branch (usually `main`) |
| `connection_type` | `scm` or `external` |
| `auto_scan` | Enable auto-scan on push |
| `project_id` | Associated project |
| `external_id` | SCM provider ID |

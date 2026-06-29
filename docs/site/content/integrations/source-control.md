---
title: Source Control Integration
description: Connect GitHub, GitLab, and Gitea
---

# Source Control Integration

## Supported Providers

| Provider | OAuth | Webhooks | PR Comments | Commit Status |
|----------|:-----:|:--------:|:-----------:|:-------------:|
| GitHub | ✅ | ✅ | ✅ | ✅ |
| GitLab | ✅ | ✅ | ✅ | ✅ |
| Gitea | ✅ | ✅ | ✅ | ✅ |

## Connection Flow

```mermaid
sequenceDiagram
    actor User
    participant App
    participant SCM as SCM Provider

    User->>App: Click "Connect Provider"
    App->>SCM: OAuth authorize
    SCM-->>App: Access token
    App->>App: Store credentials (encrypted)
```

## Repository Sync

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant Worker as sync-source-control
    participant SCM as SCM Provider
    participant DB[(Database)]

    Cron->>Worker: Every 30 minutes
    Worker->>DB: SELECT source_controls
    Worker->>SCM: List repositories
    SCM-->>Worker: Repository list
    Worker->>DB: UPSERT source_control_repositories
```

## Import Repository

```mermaid
sequenceDiagram
    actor User
    participant App
    participant DB[(Database)]

    User->>App: Select repository to import
    App->>DB: INSERT repository
    App->>App: Setup webhook (if auto-scan)
    App-->>User: 201 { repository }
```

## Disconnect Provider

```mermaid
sequenceDiagram
    actor User
    participant App
    participant SCM as SCM Provider
    participant DB[(Database)]

    User->>App: Click "Disconnect"
    App->>SCM: Remove webhook
    App->>DB: DELETE source_control
    App->>DB: Mark repositories as disconnected
```

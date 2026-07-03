---
title: Workspace Model
description: Multi-tenant architecture and role-based access control
---

# Workspace Model

## Overview

SAST Integration uses a workspace-based multi-tenant architecture. Workspaces isolate data, members, and configurations.

## Hierarchy

```mermaid
graph TB
    subgraph "Workspace"
        W["Workspace"]
        M["Members"]
        T["Teams"]
        P["Projects"]
        R["Repositories"]
        S["Scans"]
        F["Findings"]
        Q["Quality Gates"]
    end

    W --> M
    W --> T
    W --> P
    W --> R
    W --> S
    W --> F
    W --> Q
    P --> R
    T --> M
    P --> M

    style W fill:#4a9eff,color:#fff
```

## Workspace Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `multiple` | Users create personal workspaces + join org workspaces | Default, SaaS-style |
| `single` | One shared organization workspace, invite-only | Self-hosted, enterprise |

```mermaid
flowchart TD
    A{"WORKSPACE_MODE?"}
    A -->|"multiple"| B["Users sign up freely<br/>Create personal workspace<br/>+ Join org workspaces"]
    A -->|"single"| C["One shared workspace<br/>Invite-only<br/>No self-signup"]

    style B fill:#4a9eff,color:#fff
    style C fill:#f59e0b,color:#fff
```

## Data Isolation

```mermaid
graph TB
    subgraph "Workspace A"
        P1["Projects A"]
        R1["Repositories A"]
        S1["Scans A"]
        F1["Findings A"]
    end

    subgraph "Workspace B"
        P2["Projects B"]
        R2["Repositories B"]
        S2["Scans B"]
        F2["Findings B"]
    end

    P1 --> R1 --> S1 --> F1
    P2 --> R2 --> S2 --> F2

    style P1 fill:#4a9eff,color:#fff
    style P2 fill:#10b981,color:#fff
```

All database queries are scoped by `workspaceId`. Users can only access data within their assigned workspaces.

## Role Hierarchy

```mermaid
graph TB
    Owner["👑 Owner<br/>Level 4<br/>39 permissions"] --> Manager["🔧 Manager<br/>Level 3<br/>39 permissions"]
    Manager --> Reviewer["🔍 Reviewer<br/>Level 2<br/>23 permissions"]
    Reviewer --> Member["👤 Member<br/>Level 1<br/>17 permissions"]

    style Owner fill:#ef4444,color:#fff
    style Manager fill:#f59e0b,color:#fff
    style Reviewer fill:#4a9eff,color:#fff
    style Member fill:#22c55e,color:#fff
```

## Permission Matrix

| Capability | Owner | Manager | Reviewer | Member |
|------------|:-----:|:-------:|:--------:|:------:|
| View dashboard | ✅ | ✅ | ✅ | ✅ |
| View findings | ✅ | ✅ | ✅ | ✅ |
| Trigger scans | ✅ | ✅ | ✅ | ❌ |
| Triage findings | ✅ | ✅ | ✅ | ❌ |
| Override AI verdict | ✅ | ✅ | ✅ | ❌ |
| Export reports | ✅ | ✅ | ✅ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| Change member roles | ✅ | ❌ | ❌ | ❌ |
| Workspace settings | ✅ | ✅ | ❌ | ❌ |

## Access Control Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB[(Database)]

    User->>API: GET /api/v1/scans
    API->>DB: SELECT * FROM scans WHERE workspace_id = ?
    Note right of DB: workspace_id from<br/>JWT session
    DB-->>API: Scans for this workspace only
    API-->>User: 200 { data: [...] }
```

## Team Model

```mermaid
graph TB
    W["Workspace"] --> T1["Team A"]
    W --> T2["Team B"]
    T1 --> M1["Member 1<br/>(admin)"]
    T1 --> M2["Member 2<br/>(contributor)"]
    T2 --> M3["Member 3<br/>(admin)"]
    T2 --> M4["Member 4<br/>(contributor)"]

    P["Project"] --> T1
    P --> M2

    style W fill:#4a9eff,color:#fff
    style P fill:#f59e0b,color:#fff
```

| Role | Permissions |
|------|------------|
| Admin | Full team management (add/remove members, edit team) |
| Contributor | View team, participate in team projects |

## Invitation Flow

```mermaid
sequenceDiagram
    actor Owner
    participant API
    participant Mail
    participant DB[(Database)]

    Owner->>API: POST /api/v1/members/invite
    API->>DB: INSERT workspace_invitation
    API->>Mail: Send invitation email
    API-->>Owner: 201

    Note over API,DB: Invitee accepts
    API->>DB: INSERT workspace_member
    API->>DB: DELETE workspace_invitation
```

## Workspace Settings

| Setting | Description |
|---------|-------------|
| `name` | Workspace display name |
| `slug` | URL-friendly identifier |
| `description` | Workspace description |
| `type` | `personal` or `organization` |
| `features` | JSONB feature flags override |

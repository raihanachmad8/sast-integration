---
title: Project Access Control
description: Project-level access control and member management
---

# Project Access Control

## Overview

Projects provide an additional layer of access control within workspaces.

## Project Structure

```mermaid
graph TB
    W["Workspace"] --> P["Project"]
    P --> R["Repositories"]
    P --> M["Members"]
    P --> T["Teams"]
    P --> API["API Tokens"]
    P --> S["Scans"]
    P --> F["Findings"]

    style W fill:#4a9eff,color:#fff
    style P fill:#f59e0b,color:#fff
```

## Access Methods

| Method | Description |
|--------|-------------|
| **Direct membership** | User → project via `project_members` |
| **Team assignment** | Team → project via `project_teams` |
| **Workspace role** | Owner/Manager have full project access |

## Access Check Flow

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB[(Database)]

    User->>API: GET /api/v1/projects/:id/scans
    API->>API: authenticate(request)
    API->>DB: getAccessibleProjectIds(userId, workspaceId)
    API->>API: Check if projectId in accessible IDs
    API->>DB: SELECT scans WHERE project_id = ?
    API-->>User: 200 or 403
```

## Project Members

| Role | Permissions |
|------|------------|
| Admin | Full project management |
| Member | View project data |

## Project Teams

Teams can be assigned to projects for group-based access:

```mermaid
graph LR
    T["Team A"] --> P["Project X"]
    T["Team A"] --> P2["Project Y"]
    T2["Team B"] --> P

    style T fill:#4a9eff,color:#fff
    style T2 fill:#10b981,color:#fff
```

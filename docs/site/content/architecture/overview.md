---
title: Architecture Overview
description: System architecture and technical design
---

# Architecture Overview

## System Architecture

```mermaid
graph TB
    subgraph "Presentation Layer"
        Pages["Next.js Pages<br/>(Server/Client)"]
        Features["Feature Components<br/>(src/features/)"]
        Shared["Shared Components<br/>(src/commons/)"]
    end

    subgraph "Data Layer"
        Modules["Client Modules<br/>(src/modules/)"]
        ReactQuery["TanStack Query"]
        Axios["Axios Client<br/>(auto-refresh)"]
    end

    subgraph "API Layer"
        RouteHandlers["Route Handlers<br/>(src/app/api/v1/)"]
        Middleware["Middleware<br/>(auth, validate)"]
    end

    subgraph "Business Logic"
        Services["Services<br/>(server/modules/*/services/)"]
        Repos["Repositories<br/>(server/modules/*/repositories/)"]
    end

    subgraph "Data Persistence"
        Drizzle["Drizzle ORM"]
        PG[("PostgreSQL")]
        Queue["pg-boss<br/>Workers"]
    end

    Pages --> Features --> Shared
    Features --> Modules
    Modules --> ReactQuery --> Axios
    Axios --> RouteHandlers
    RouteHandlers --> Middleware
    Middleware --> Services
    Services --> Repos
    Repos --> Drizzle --> PG
    Queue --> PG

    style Pages fill:#4a9eff,color:#fff
    style Services fill:#f59e0b,color:#fff
    style PG fill:#336791,color:#fff
```

## Request Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant H as Route Handler
    participant M as Middleware
    participant S as Service
    participant R as Repository
    participant D as Database

    C->>H: GET /api/v1/scans
    H->>M: authenticate(request)
    M->>M: Verify JWT + Session
    M->>H: { userId, workspaceId }
    H->>M: validateBody(request, schema)
    M->>H: validated data
    H->>S: scanService.list(params)
    S->>R: scanRepository.list(params)
    R->>D: SELECT * FROM scans
    D-->>R: rows
    R-->>S: Scan[]
    S-->>H: { data, pagination }
    H-->>C: 200 { success, data, meta }
```

## Directory Structure

```mermaid
graph TB
    subgraph "src/"
        App["app/<br/>Pages & Routes"]
        Server["server/<br/>Server-Only"]
        Modules["modules/<br/>Data Layer"]
        Features["features/<br/>Page Components"]
        Commons["commons/<br/>Shared Code"]
        Lib["lib/<br/>Client Utilities"]
    end

    subgraph "server/"
        HTTP["http/<br/>Middleware"]
        ServerMods["modules/<br/>Business Logic"]
        DB["db/<br/>Client"]
    end

    style Server fill:#ef4444,color:#fff
    style Modules fill:#4a9eff,color:#fff
    style Features fill:#10b981,color:#fff
```

```
src/
├── app/                    # Next.js App Router
│   ├── (authenticated)/    # Protected routes (workspace-scoped)
│   │   └── [workspace]/    # 19+ page routes
│   ├── (public)/           # Public docs & landing
│   ├── (unauthenticated)/  # Auth pages
│   └── api/v1/             # REST API handlers
├── commons/                # Shared code
│   ├── constants/          # App config, permissions, routes
│   ├── schemas/            # Zod validation schemas
│   └── components/         # Shared UI components
├── features/               # Page-level feature components
├── lib/                    # Client utilities
│   ├── api/                # Axios client with auto-refresh
│   ├── hooks/              # Custom React hooks
│   └── docs/               # MDX rendering
├── modules/                # Client data layer (21 domains)
│   └── {domain}/           # api.ts, queries.ts, keys.ts
├── server/                 # Server-only code
│   ├── env.ts              # Zod-validated environment
│   ├── db/client.ts        # Drizzle DB client
│   ├── http/               # Middleware layer
│   └── modules/            # Business logic
│       ├── auth/           # JWT, sessions, rate limiter
│       ├── workspace/      # Workspace & member management
│       ├── mail/           # Email service
│       └── storage/        # File storage
└── config/                 # Theme & environment
```

## Data Flow

```mermaid
flowchart LR
    A["React Component"] --> B["useQuery / useMutation"]
    B --> C["module/queries.ts"]
    D["module/api.ts"] --> C
    E["Axios Client"] --> D
    F["Route Handler"] --> E
    G["Service"] --> F
    H["Repository"] --> G
    I["Drizzle ORM"] --> H
    J[("PostgreSQL")] --> I

    style A fill:#4a9eff,color:#fff
    style J fill:#336791,color:#fff
```

| Layer | Location | Responsibility |
|-------|----------|---------------|
| Page | `app/**/page.tsx` | Compose features, fetch data |
| Feature UI | `features/*/` | Render UI, handle interactions |
| Query Hook | `modules/*/queries.ts` | TanStack Query cache layer |
| Client API | `modules/*/api.ts` | HTTP calls to API routes |
| API Route | `app/api/v1/**/` | Validate input, call service |
| Service | `server/modules/*/services/` | Business logic orchestration |
| Repository | `server/modules/*/repositories/` | Database queries (Drizzle) |
| Database | PostgreSQL | Data persistence |

## Key Design Decisions

### Server/Client Separation

Server modules (`server/`) are never imported from client code. Client data access goes through API routes via `modules/api.ts`.

### Feature Module Pattern

Each feature is self-contained:

```
features/
└── scan/
    ├── ScanTable.tsx
    ├── ScanDetailDrawer.tsx
    ├── ScanTimeline.tsx
    ├── NewScanModal.tsx
    └── index.ts
```

### Permission-First UI

Every page uses a layered guard system:

```mermaid
flowchart LR
    A["Page"] --> B["FeatureGate<br/>(feature flag)"]
    B --> C["PermissionGate<br/>(VIEW)"]
    C --> D["PageContent"]
    D --> E["PermissionGate<br/>(MANAGE)"]
```

### Queue-Based Scan Processing

Scans are processed asynchronously via pg-boss:

```mermaid
flowchart LR
    A["POST /scans"] --> B["Enqueue<br/>run-managed-scan"]
    B --> C["Git Clone"]
    C --> D["Run Scanners<br/>(parallel)"]
    D --> E["Parse Results"]
    E --> F["Create Findings"]
    F --> G["AI Verify"]
    G --> H["Quality Gate"]
```

## Database Schema

37 tables organized by domain:

| Domain | Tables | File |
|--------|--------|------|
| Users & Auth | users, sessions, user_settings, tokens, notifications | users.ts, auth.ts |
| Workspaces | workspaces, workspace_members, workspace_settings | workspaces.ts |
| Teams | teams, team_members | teams.ts |
| Projects | projects, project_members, project_teams, environments, api_tokens | projects.ts |
| Source Control | source_controls, source_control_repositories, source_control_imports, repositories | source-controls.ts |
| Scans | scans, scan_results, quality_gates, quality_gate_results, schedules, scan_uploads, commit_statuses | scans.ts |
| Findings | finding_groups, findings, ai_verifications, finding_history, finding_group_scans | findings.ts |
| Integrations | ai_models, webhooks, webhook_deliveries, audit_logs, activity_logs, knowledge_sources, knowledge_entries, knowledge_backfill_jobs | integrations.ts |
| Reports | reports, storage_files | reports.ts |

See [Database Reference](../reference/environment-variables.md) for complete schema documentation.

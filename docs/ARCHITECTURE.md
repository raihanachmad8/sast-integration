# Architecture

Comprehensive system architecture for SAST Integration platform.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Application Layers](#application-layers)
- [Authentication Flow](#authentication-flow)
- [Scan Pipeline](#scan-pipeline)
- [Findings Lifecycle](#findings-lifecycle)
- [AI Verification Flow](#ai-verification-flow)
- [Queue System](#queue-system)
- [Quality Gates](#quality-gates)
- [Source Control Integration](#source-control-integration)
- [Storage System](#storage-system)
- [Multi-Tenancy Model](#multi-tenancy-model)
- [API Architecture](#api-architecture)
- [Client Architecture](#client-architecture)

---

## System Overview

SAST Integration is a multi-tenant Static Application Security Testing platform that unifies multiple SAST scanners, enriches findings with AI-powered verification, and provides a structured workflow for triage and collaboration.

```mermaid
graph TB
    subgraph "User Layer"
        Browser["🌐 Browser"]
        CLI["⌨️ CLI / CI/CD"]
    end

    subgraph "Application Layer"
        NextJS["Next.js 16<br/>(App Router)"]
        API["REST API<br/>/api/v1/*"]
        SSR["SSR Pages"]
        Workers["pg-boss<br/>Workers"]
    end

    subgraph "Scanner Layer"
        Semgrep["🔍 Semgrep"]
        Gitleaks["🔑 Gitleaks"]
        Flawfinder["🐛 Flawfinder"]
        Cppcheck["⚡ Cppcheck"]
        ClangTidy["🔧 Clang-Tidy"]
        GCC["🏗️ GCC FanAnalyzer"]
    end

    subgraph "AI Layer"
        Ollama["🦙 Ollama"]
        OpenAI["🤖 OpenAI"]
        Anthropic["🧠 Anthropic"]
        Custom["🔌 Custom"]
    end

    subgraph "Data Layer"
        Postgres[("🐘 PostgreSQL")]
        Redis["📦 Redis<br/>(optional)"]
        Storage["💾 Storage<br/>(S3/Local/Cloudinary)"]
    end

    subgraph "External Integrations"
        GitHub["GitHub"]
        GitLab["GitLab"]
        Gitea["Gitea"]
        NVD["NVD/CWE<br/>Knowledge Base"]
    end

    Browser --> NextJS
    CLI --> API
    NextJS --> API
    NextJS --> SSR
    API --> Workers
    Workers --> Semgrep
    Workers --> Gitleaks
    Workers --> Flawfinder
    Workers --> Cppcheck
    Workers --> ClangTidy
    Workers --> GCC
    Workers --> Ollama
    Workers --> OpenAI
    Workers --> Anthropic
    Workers --> Custom
    API --> Postgres
    Workers --> Postgres
    API --> Storage
    Workers --> Storage
    Workers --> GitHub
    Workers --> GitLab
    Workers --> Gitea
    Workers --> NVD

    style NextJS fill:#4a9eff,color:#fff
    style Postgres fill:#336791,color:#fff
    style Workers fill:#f59e0b,color:#fff
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.9 |
| Language | TypeScript | 5 (strict) |
| UI | Ant Design | 6 |
| ORM | Drizzle ORM | 0.45.2 |
| Database | PostgreSQL | 16 |
| Queue | pg-boss | — |
| Auth | JWT (jose) + bcryptjs | — |
| Validation | Zod | — |
| Testing | Vitest + Playwright | — |
| Container | Docker (Alpine Linux) | — |
| Package Manager | pnpm | 10+ |

---

## Directory Structure

```mermaid
graph LR
    subgraph "src/"
        App["app/<br/>Pages & Routes"]
        Commons["commons/<br/>Shared Code"]
        Config["config/<br/>Theme & Env"]
        Features["features/<br/>Page Components"]
        Lib["lib/<br/>Client Utilities"]
        Modules["modules/<br/>Data Layer"]
        Server["server/<br/>Server-Only"]
    end

    subgraph "server/"
        HTTP["http/<br/>Middleware"]
        ServerModules["modules/<br/>Business Logic"]
        Env["env.ts<br/>Config"]
        DB["db/<br/>Client"]
    end

    subgraph "modules/ (per domain)"
        API["api.ts<br/>HTTP Client"]
        Queries["queries.ts<br/>React Query Hooks"]
        Keys["keys.ts<br/>Query Keys"]
        ModuleTypes["types.ts<br/>Types"]
    end

    style Server fill:#ef4444,color:#fff
    style Modules fill:#4a9eff,color:#fff
    style Features fill:#10b981,color:#fff
```

```
src/
├── app/                        # Next.js App Router
│   ├── (authenticated)/        # Protected routes (workspace-scoped)
│   │   └── [workspace]/        # 19+ page routes
│   ├── (public)/               # Public docs & landing
│   ├── (unauthenticated)/      # Auth pages (signin, signup, etc.)
│   └── api/v1/                 # REST API handlers
├── commons/                    # Shared across frontend & server
│   ├── components/             # Shared UI components (LoadingState, ErrorState, etc.)
│   │   └── layout/             # AppShell, AuthenticatedShell, SidebarNav, WorkspaceSwitcher
│   ├── constants/              # App config, permissions, routes, tokens, feature-flags
│   ├── providers/              # AntdProvider, QueryProvider
│   ├── schemas/                # Zod validation schemas (24 files)
│   ├── types/                  # TypeScript interfaces
│   └── utils/                  # slug utility
├── config/                     # antd-theme.ts, client-env.ts
├── features/                   # Page-level feature components (20 modules)
├── lib/                        # Client utilities
│   ├── api/                    # Axios client with auto-refresh
│   ├── docs/                   # MDX rendering
│   ├── hooks/                  # Custom React hooks (useBreakpoint, usePermissions, etc.)
│   ├── utils/                  # formatDate, getInitials, roleLabel, export helpers
│   └── pagination.ts           # Client-side pagination utilities
├── modules/                    # Client data layer (21 domains)
│   └── {domain}/               # api.ts, queries.ts, keys.ts, types.ts
├── server/                     # Server-only code
│   ├── env.ts                  # Zod-validated environment
│   ├── db/client.ts            # Drizzle DB client (lazy proxy)
│   ├── http/                   # HTTP middleware layer
│   └── modules/                # Server business logic (20 modules)
│       ├── auth/               # JWT, sessions, rate limiter
│       ├── workspace/          # Workspace & member management
│       ├── mail/               # Email service
│       ├── storage/            # File storage (S3/Local/Cloudinary)
│       ├── scan/               # Scanning pipeline, parsers, AI verification
│       ├── source-control/     # SCM providers (GitHub, GitLab, Gitea)
│       ├── knowledge-base/     # CWE/NVD knowledge base
│       ├── queue/              # pg-boss job queue (9 workers)
│       └── ...                 # (20 modules total)
```

---

## Application Layers

```mermaid
graph TB
    subgraph "Presentation Layer"
        Pages["Next.js Pages<br/>(Server/Client Components)"]
        Features["Feature Components<br/>(src/features/)"]
        Shared["Shared Components<br/>(src/commons/components/)"]
    end

    subgraph "Data Layer"
        Modules["Client Modules<br/>(src/modules/)"]
        ReactQuery["TanStack Query<br/>(Cache & State)"]
        Axios["Axios Client<br/>(Auto-refresh)"]
    end

    subgraph "API Layer"
        RouteHandlers["Route Handlers<br/>(src/app/api/v1/)"]
        Middleware["Middleware<br/>(auth, validate, response)"]
    end

    subgraph "Business Logic Layer"
        Services["Services<br/>(src/server/modules/*/services/)"]
        Repositories["Repositories<br/>(src/server/modules/*/repositories/)"]
    end

    subgraph "Data Layer (Server)"
        Drizzle["Drizzle ORM<br/>(Schema & Queries)"]
        PostgreSQL[("PostgreSQL")]
    end

    Pages --> Features --> Shared
    Features --> Modules
    Modules --> ReactQuery --> Axios
    Axios --> RouteHandlers
    RouteHandlers --> Middleware
    Middleware --> Services
    Services --> Repositories
    Repositories --> Drizzle
    Drizzle --> PostgreSQL

    style Pages fill:#4a9eff,color:#fff
    style Services fill:#f59e0b,color:#fff
    style PostgreSQL fill:#336791,color:#fff
```

### Request Flow (API)

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
    M->>M: Check workspace access
    M->>H: { userId, workspaceId }
    H->>M: validateBody(request, schema)
    M->>M: Zod parse
    M->>H: validated data
    H->>S: scanService.list(params)
    S->>R: scanRepository.list(params)
    R->>D: SELECT * FROM scans
    D-->>R: rows
    R-->>S: Scan[]
    S-->>H: { data, pagination }
    H-->>C: 200 { success, data, meta }
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Client
    participant API
    participant Auth as Auth Service
    participant DB[(PostgreSQL)]

    Note over User, DB: Sign In
    User->>Client: Enter email + password
    Client->>API: POST /auth/signin
    API->>Auth: authService.signin()
    Auth->>DB: SELECT user by email
    DB-->>Auth: user record
    Auth->>Auth: bcrypt.compare(password, hash)
    Auth->>DB: INSERT session
    Auth->>Auth: Generate access JWT (15m)
    Auth->>Auth: Generate refresh JWT (7d)
    Auth-->>API: { accessToken, refreshToken, user }
    API-->>Client: 200 + Set-Cookie

    Note over User, DB: Token Refresh
    Client->>API: POST /auth/refresh (x-refresh-request: 1)
    API->>Auth: authService.refresh()
    Auth->>Auth: Verify refresh JWT
    Auth->>DB: Validate session + check refreshTokenId
    Auth->>DB: UPDATE session (new refreshTokenId)
    Auth->>Auth: Generate new access + refresh tokens
    Auth-->>Client: { accessToken, refreshToken }

    Note over User, DB: Reuse Detection
    Client->>API: POST /auth/refresh (old refresh token)
    API->>Auth: authService.refresh()
    Auth->>DB: Session has different refreshTokenId
    Auth->>DB: DELETE session (all tokens compromised)
    Auth-->>Client: 401 Unauthorized
```

### JWT Token Flow

```mermaid
graph LR
    subgraph "Token Types"
        Access["Access Token<br/>(15 min)"]
        Refresh["Refresh Token<br/>(7 days)"]
        PAT["Personal Access<br/>Token (PAT)"]
        ProjectToken["Project API<br/>Token"]
    end

    subgraph "Storage"
        Cookie["HttpOnly Cookie<br/>(refreshToken)"]
        Memory["In-Memory<br/>(accessToken)"]
        DB[(Database<br/>(sessions))]
    end

    Access --> Memory
    Refresh --> Cookie
    Refresh --> DB
    PAT --> DB
    ProjectToken --> DB

    style Access fill:#22c55e,color:#fff
    style Refresh fill:#f59e0b,color:#fff
    style PAT fill:#4a9eff,color:#fff
    style ProjectToken fill:#a855f7,color:#fff
```

---

## Scan Pipeline

The scan pipeline is the core flow — from trigger to results.

```mermaid
stateDiagram-v2
    [*] --> pending: Trigger scan
    pending --> queued: Enqueued
    queued --> cloning: Worker picks up
    cloning --> scanning: Repo cloned
    scanning --> parsing: Scanner output
    parsing --> ai_verifying: Results parsed
    ai_verifying --> completed: AI verification done
    ai_verifying --> failed: Error occurred
    completed --> [*]
    failed --> [*]

    note right of pending: Managed: user triggers\nExternal: CI/CD upload
    note right of scanning: Multiple scanners run\nin parallel
    note right of ai_verifying: AI models verify\ntrue/false positive
```

### Scan Trigger Flow

```mermaid
flowchart TD
    A["User clicks 'Run Scan'"] --> B{"Scan Type?"}
    B -->|"Managed (in-app)"| C["POST /api/v1/scans"]
    B -->|"External (CI/CD)"| D["POST /api/v1/scans/upload/init"]
    B -->|"Scheduled"| E["trigger-scheduled-managed-scan worker"]

    C --> F["Create scan record<br/>status: pending"]
    D --> G["Create scan upload<br/>+ scan record"]
    E --> F

    F --> H["Enqueue run-managed-scan job"]
    G --> I["CI uploads results<br/>POST /scans/upload"]
    H --> J["Worker: git clone repo"]
    I --> K["Worker: parse-scan-result"]

    J --> L["Run scanners in parallel"]
    L --> M["Parse results"]
    M --> N["Create finding_groups<br/>(deduplicate by fingerprint)"]
    N --> O["Create findings<br/>(per-rule occurrences)"]
    O --> P["Enqueue ai-verify-finding"]
    P --> Q["AI verifies each finding"]
    Q --> R["Update scan status"]
    R --> S["Evaluate quality gate"]
    S --> T["Post commit status<br/>(if PR)"]

    style A fill:#4a9eff,color:#fff
    style Q fill:#f59e0b,color:#fff
    style S fill:#ef4444,color:#fff
```

### Scanner Execution

```mermaid
flowchart LR
    subgraph "Scan Worker"
        Clone["git clone"] --> Scanner["Scanner Router"]
    end

    subgraph "Scanners (parallel)"
        Scanner --> Semgrep["Semgrep<br/>(multi-language)"]
        Scanner --> Gitleaks["Gitleaks<br/>(secrets)"]
        Scanner --> Flawfinder["Flawfinder<br/>(C/C++)"]
        Scanner --> Cppcheck["Cppcheck<br/>(C/C++)"]
        Scanner --> ClangTidy["Clang-Tidy<br/>(C/C++)"]
        Scanner --> GCC["GCC FanAnalyzer<br/>(C/C++)"]
    end

    subgraph "Parsers"
        Semgrep --> ParseJSON["JSON Parser"]
        Gitleaks --> ParseJSON
        Flawfinder --> ParseCSV["CSV Parser"]
        Cppcheck --> ParseXML["XML Parser"]
        ClangTidy --> ParseDiagnostic["Diagnostic Parser"]
        GCC --> ParseGCC["GCC Output Parser"]
    end

    ParseJSON --> Results["Structured Findings"]
    ParseCSV --> Results
    ParseXML --> Results
    ParseDiagnostic --> Results
    ParseGCC --> Results
```

### Finding Deduplication

```mermaid
flowchart TD
    A["Scanner output"] --> B["Generate fingerprint<br/>SHA-256(rule + file + line + code)"]
    B --> C{"Fingerprint exists<br/>in finding_groups?"}
    C -->|"Yes (same repo)"| D["Update last_seen_at<br/>Add to finding_group_scans<br/>isNew=false"]
    C -->|"No"| E["Create new finding_group<br/>isNew=true"]
    D --> F["Create finding record<br/>(link to group)"]
    E --> F
    F --> G["Enqueue AI verification"]

    style C fill:#f59e0b,color:#fff
    style E fill:#22c55e,color:#fff
```

---

## Findings Lifecycle

```mermaid
stateDiagram-v2
    [*] --> open: Scan finds issue
    open --> dismissed: User dismisses
    open --> resolved: User resolves
    open --> in_progress: User starts triage
    in_progress --> open: Back to triage
    dismissed --> open: Reopens finding
    resolved --> open: Reopens finding

    note right of open: Default state\nAI verdict: pending
    note right of dismissed: Not a real issue\n(False positive)
    note right of resolved: Fixed in code
```

### Finding Status Flow

```mermaid
flowchart TD
    A["Finding created<br/>status: open"] --> B{"User action?"}
    B -->|"Dismiss"| C["status: dismissed<br/>reason: false_positive"]
    B -->|"Resolve"| D["status: resolved<br/>reason: fixed"]
    B -->|"Assign"| E["assigned_to: user_id"]
    B -->|"Re-verify"| F["Enqueue AI re-verification"]
    F --> G["AI updates verdict"]
    G --> H{"New verdict?"}
    H -->|"TP confirmed"| I["Keep open"]
    H -->|"FP confirmed"| C

    C -->|"Reopen"| A
    D -->|"Reopen"| A
```

---

## AI Verification Flow

```mermaid
sequenceDiagram
    participant Q as Queue Worker
    participant V as AI Verifier
    participant M as AI Model
    participant K as Knowledge Base
    participant DB[(Database)]

    Q->>V: ai-verify-finding job
    V->>DB: Get finding + group details
    V->>DB: Get knowledge entries (CWE context)
    V->>M: Send verification prompt
    Note over V,M: Prompt includes:<br/>- Finding description<br/>- Code snippet<br/>- CWE context<br/>- Scanner rule<br/>- Similar findings
    M-->>V: { verdict, confidence, explanation }
    V->>DB: INSERT ai_verification
    V->>DB: UPDATE finding_group.status
    V->>DB: UPDATE finding_group.verdict
    Note over V,DB: If confidence < threshold,<br/>mark as pending for human review
```

### AI Model Fallback Chain

```mermaid
flowchart TD
    A["AI verification request"] --> B["Try primary model<br/>(priority: 1)"]
    B --> C{"Success?"}
    C -->|"Yes"| D["Return result"]
    C -->|"Timeout/Error"| E["Try next model<br/>(priority: 2+)"]
    E --> F{"Success?"}
    F -->|"Yes"| D
    F -->|"No more models"| G["Mark as pending<br/>(human review needed)"]

    style D fill:#22c55e,color:#fff
    style G fill:#f59e0b,color:#fff
```

---

## Queue System

All background jobs run via **pg-boss** (in-process, no separate worker service).

```mermaid
graph TB
    subgraph "pg-boss Queue"
        direction LR
        Q1["parse-scan-result"]
        Q2["run-managed-scan"]
        Q3["ai-verify-finding"]
        Q4["sync-source-control"]
        Q5["scan-timeout-watchdog"]
        Q6["cleanup-old-scan-files"]
        Q7["sync-knowledge-base"]
        Q8["trigger-scheduled-managed-scan"]
        Q9["nvd-knowledge-backfill"]
    end

    subgraph "Triggers"
        T1["API: trigger scan"]
        T2["API: upload results"]
        T3["Scan completion"]
        T4["Cron: 30min"]
        T5["Cron: 5min"]
        T6["Cron: daily 2am"]
        T7["Cron: 6 hours"]
        T8["Cron: schedule check"]
        T9["Manual trigger"]
    end

    T1 --> Q2
    T2 --> Q1
    T3 --> Q3
    T4 --> Q4
    T5 --> Q5
    T6 --> Q6
    T7 --> Q7
    T8 --> Q8
    T9 --> Q9

    style Q1 fill:#f59e0b,color:#fff
    style Q2 fill:#f59e0b,color:#fff
    style Q3 fill:#a855f7,color:#fff
```

| Worker | Trigger | Purpose |
|--------|---------|---------|
| `parse-scan-result` | External upload | Parse CI/CD scan results |
| `run-managed-scan` | User action | Execute in-app managed scan |
| `ai-verify-finding` | Scan completion | AI verify each finding |
| `sync-source-control` | Every 30 min | Sync repos from SCM providers |
| `scan-timeout-watchdog` | Every 5 min | Clean orphaned/timed-out scans |
| `cleanup-old-scan-files` | Daily 2am | Remove old scan artifacts |
| `sync-knowledge-base` | Every 6 hours | Sync NVD/CWE data |
| `trigger-scheduled-managed-scan` | Cron check | Run scheduled scans |
| `nvd-knowledge-backfill` | Manual | Backfill NVD knowledge base |

---

## Quality Gates

```mermaid
flowchart TD
    A["Scan completed"] --> B["Get quality gate config<br/>(per workspace)"]
    B --> C["Count findings by severity"]
    C --> D{"Evaluate rules"}
    D --> E{"fail_on_critical<br/>AND critical > 0?"}
    D --> F{"fail_on_high<br/>AND high > 0?"}
    D --> G{"fail_on_pending<br/>AND pending > 0?"}
    D --> H{"require_human_ack?"}

    E -->|"Yes"| I["status: FAIL"]
    F -->|"Yes"| I
    G -->|"Yes + pending_behavior=fail"| I
    G -->|"Yes + pending_behavior=warn"| J["status: WARN"]
    H -->|"Yes + unresolved AI"| J
    E -->|"No"| K["status: PASS"]
    F -->|"No"| K
    G -->|"No"| K

    I --> L["Post commit status<br/>status: failure"]
    J --> L2["Post commit status<br/>status: pending"]
    K --> L3["Post commit status<br/>status: success"]

    style I fill:#ef4444,color:#fff
    style J fill:#f59e0b,color:#fff
    style K fill:#22c55e,color:#fff
```

---

## Source Control Integration

```mermaid
sequenceDiagram
    actor User
    participant App as SAST App
    participant SCM as SCM Provider
    participant DB[(Database)]

    Note over User, DB: Connect Provider
    User->>App: Add GitHub/GitLab/Gitea
    App->>SCM: OAuth flow
    SCM-->>App: Access token
    App->>DB: Store credentials (encrypted)
    App->>DB: Create source_control record

    Note over User, DB: Sync Repositories
    App->>SCM: List repositories
    SCM-->>App: Repository list
    App->>DB: Upsert source_control_repositories

    Note over User, DB: Import Repository
    User->>App: Import repo to project
    App->>DB: Create repository record
    App->>SCM: Setup webhook (if auto-scan)
    SCM-->>App: Webhook ID
    App->>DB: Store webhook_external_id

    Note over User, DB: Webhook Push Event
    SCM->>App: POST /api/v1/webhooks/scm
    App->>App: Validate webhook signature
    App->>App: Enqueue managed scan
```

---

## Storage System

```mermaid
flowchart TD
    A["File upload request"] --> B{"STORAGE_PROVIDER?"}
    B -->|"local"| C["LocalDriver<br/>/app/storage/uploads/"]
    B -->|"s3"| D["S3Driver<br/>AWS S3 / MinIO"]
    B -->|"cloudinary"| E["CloudinaryDriver<br/>Cloud CDN"]

    C --> F["Write to filesystem"]
    D --> G["PUT to S3 bucket"]
    E --> H["Upload to Cloudinary"]

    F --> I["Return storage path"]
    G --> I
    H --> I

    style C fill:#22c55e,color:#fff
    style D fill:#f59e0b,color:#fff
    style E fill:#a855f7,color:#fff
```

---

## Multi-Tenancy Model

```mermaid
graph TB
    subgraph "Workspace Isolation"
        W1["Workspace A"]
        W2["Workspace B"]
    end

    subgraph "Data Isolation"
        W1 --> P1["Projects A"]
        W1 --> R1["Repositories A"]
        W1 --> S1["Scans A"]
        W1 --> F1["Findings A"]
        W2 --> P2["Projects B"]
        W2 --> R2["Repositories B"]
        W2 --> S2["Scans B"]
        W2 --> F2["Findings B"]
    end

    subgraph "Access Control"
        U1["User 1<br/>(Owner A)"] --> W1
        U2["User 2<br/>(Member A+B)"] --> W1
        U2 --> W2
    end

    style W1 fill:#4a9eff,color:#fff
    style W2 fill:#10b981,color:#fff
```

### Workspace Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `multiple` | Users create personal workspaces + join org workspaces | Default, SaaS-style |
| `single` | One shared organization workspace, invite-only | Self-hosted, enterprise |

### Role Hierarchy

```mermaid
graph TB
    Owner["👑 Owner<br/>Level 4<br/>All 39 permissions"] --> Manager["🔧 Manager<br/>Level 3<br/>39 permissions"]
    Manager --> Reviewer["🔍 Reviewer<br/>Level 2<br/>23 permissions"]
    Reviewer --> Member["👤 Member<br/>Level 1<br/>17 permissions"]

    style Owner fill:#ef4444,color:#fff
    style Manager fill:#f59e0b,color:#fff
    style Reviewer fill:#4a9eff,color:#fff
    style Member fill:#22c55e,color:#fff
```

---

## API Architecture

### Endpoint Structure

```mermaid
graph LR
    subgraph "API Modules"
        Auth["/auth/*<br/>13 endpoints"]
        Workspace["/workspaces/*<br/>11 endpoints"]
        Projects["/projects/*<br/>5 endpoints"]
        Scans["/scans/*<br/>7 endpoints"]
        Findings["/findings/*<br/>8 endpoints"]
        Repos["/repositories/*<br/>7 endpoints"]
        SCM["/source-controls/*<br/>8 endpoints"]
        AI["/ai-models/*<br/>2 endpoints"]
        KB["/knowledge/*<br/>7 endpoints"]
        Webhooks["/webhooks/*<br/>3 endpoints"]
        Reports["/reports/*<br/>4 endpoints"]
        Dashboard["/dashboard/*<br/>4 endpoints"]
        Others["/teams, /members,<br/>/schedules, etc."]
    end
```

### Response Format

```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": { ... },
  "meta": {
    "requestId": "abc-123",
    "timestamp": "2026-06-27T00:00:00Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (delete) |
| 401 | Unauthorized (no/invalid token) |
| 403 | Forbidden (missing permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate) |
| 410 | Gone (expired invitation) |
| 422 | Validation Error (Zod) |

---

## Client Architecture

### Module Pattern

```mermaid
graph TB
    subgraph "Module: {domain}/"
        API["api.ts<br/>HTTP calls"]
        Keys["keys.ts<br/>Query key factory"]
        Queries["queries.ts<br/>React Query hooks"]
        Types["types.ts<br/>TypeScript types"]
        Index["index.ts<br/>Barrel export"]
    end

    API --> Queries
    Keys --> Queries
    Types --> API
    Types --> Queries

    subgraph "Consumer"
        Feature["Feature Component"]
    end

    Feature --> Queries
    Feature --> Types

    style Queries fill:#4a9eff,color:#fff
    style API fill:#f59e0b,color:#fff
```

### Data Flow (Client → Server → DB)

```mermaid
flowchart LR
    A["React Component"] --> B["useQuery / useMutation"]
    B --> C["module/queries.ts"]
    C --> D["module/api.ts"]
    D --> E["Axios Client<br/>(auto-refresh)"]
    E --> F["Route Handler"]
    F --> G["Service"]
    G --> H["Repository"]
    H --> I["Drizzle ORM"]
    I --> J[("PostgreSQL")]
    J --> I
    I --> H
    H --> G
    G --> F
    F --> E
    E --> D
    D --> C
    C --> B
    B --> A

    style A fill:#4a9eff,color:#fff
    style J fill:#336791,color:#fff
```

### Layout Architecture

```mermaid
graph TB
    Root["Root Layout<br/>AntdProvider"] --> AuthLayout["Unauthenticated Layout<br/>QueryProvider + AuthWrapper"]
    Root --> PubLayout["Public Layout<br/>Landing/Docs Navbar"]
    Root --> AppLayout["Authenticated Layout<br/>QueryProvider + AuthShell"]

    AuthLayout --> Signin["Signin"]
    AuthLayout --> Signup["Signup"]
    AuthLayout --> ForgotPw["Forgot Password"]
    AuthLayout --> ResetPw["Reset Password"]

    PubLayout --> Landing["Landing Page"]
    PubLayout --> Docs["Documentation"]

    AppLayout --> Shell["AppShell"]
    Shell --> Sidebar["Sidebar (260px)<br/>18 nav items"]
    Shell --> Topbar["Topbar (56px)<br/>Workspace Switcher"]
    Shell --> Content["Content Area<br/>(scrollable)"]

    Sidebar --> Nav1["Navigate: 6 items"]
    Sidebar --> Nav2["Manage: 4 items"]
    Sidebar --> Nav3["Configure: 8 items"]

    style AppLayout fill:#4a9eff,color:#fff
    style Shell fill:#1e293b,color:#fff
```

---

## Database Schema Overview

### Entity Relationship (Simplified)

```mermaid
erDiagram
    users ||--o{ workspace_members : "joins"
    workspaces ||--o{ workspace_members : "has"
    workspaces ||--o{ teams : "contains"
    teams ||--o{ team_members : "has"
    users ||--o{ team_members : "joins"
    workspaces ||--o{ projects : "contains"
    projects ||--o{ project_members : "has"
    users ||--o{ project_members : "joins"
    projects ||--o{ repositories : "owns"
    repositories ||--o{ scans : "triggers"
    scans ||--o{ findings : "produces"
    scans ||--o{ scan_results : "stores"
    findings ||--o{ finding_groups : "groups into"
    finding_groups ||--o{ ai_verifications : "verified by"
    scans ||--o{ quality_gate_results : "evaluated by"
    workspaces ||--o{ quality_gates : "configures"
    workspaces ||--o{ source_controls : "connects"
    source_controls ||--o{ source_control_repositories : "syncs"
    workspaces ||--o{ webhooks : "creates"
    workspaces ||--o{ schedules : "manages"
    workspaces ||--o{ ai_models : "uses"
    workspaces ||--o{ knowledge_sources : "imports"
    knowledge_sources ||--o{ knowledge_entries : "contains"
    workspaces ||--o{ reports : "generates"
    users ||--o{ sessions : "has"
```

### Table Count: 36 tables

| Domain | Tables | File |
|--------|--------|------|
| Users & Auth | users, sessions, user_settings, workspace_invitations, password_reset_tokens, email_verification_tokens, personal_access_tokens | users.ts, auth.ts |
| Workspaces | workspaces, workspace_members, workspace_settings | workspaces.ts |
| Teams | teams, team_members | teams.ts |
| Projects | projects, project_members, project_teams, environments, project_api_tokens | projects.ts |
| Source Control | source_controls, source_control_repositories, source_control_imports, repositories | source-controls.ts |
| Scans | scans, scan_results, quality_gates, quality_gate_results, schedules, scan_uploads, commit_statuses | scans.ts |
| Findings | finding_groups, findings, ai_verifications, finding_history, finding_group_scans | findings.ts |
| Integrations | ai_models, webhooks, webhook_deliveries, audit_logs, activity_logs, knowledge_sources, knowledge_entries, knowledge_backfill_jobs | integrations.ts |
| Reports | reports, storage_files | reports.ts |

---

## Environment Architecture

```mermaid
graph TB
    subgraph "Client-Side (Browser)"
        PUBLIC["NEXT_PUBLIC_*<br/>12 feature flags<br/>+ app URL"]
    end

    subgraph "Server-Side (Node.js)"
        REQUIRED["Required<br/>DATABASE_URL<br/>JWT_SECRET<br/>NODE_ENV"]
        OPTIONAL["Optional<br/>PORT, MAIL_PROVIDER<br/>STORAGE_PROVIDER<br/>WORKSPACE_MODE"]
        FEATURES["Feature Flags<br/>FEATURE_FLAG_*<br/>(17 flags)"]
    end

    subgraph "Build-Time"
        NEXT_PUBLIC["NEXT_PUBLIC_*<br/>Bundled into client"]
    end

    PUBLIC --> NEXT_PUBLIC
    REQUIRED --> Server["Server Runtime"]
    OPTIONAL --> Server
    FEATURES --> Server

    style Server fill:#ef4444,color:#fff
    style NEXT_PUBLIC fill:#4a9eff,color:#fff
```

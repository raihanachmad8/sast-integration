# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Next.js dev server (http://localhost:3000)
pnpm build        # Production build
pnpm start        # Start production server
pnpm lint         # ESLint check
pnpm test         # Unit tests (Vitest, project: unit)
pnpm test:e2e     # E2E API tests (Vitest, project: e2e)
pnpm test:watch   # Unit tests in watch mode
pnpm test:ui      # Playwright UI tests (headless)
pnpm test:ui:headed  # Playwright UI tests (headed)
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run pending migrations
pnpm db:push      # Push schema to DB (create/alter tables)
pnpm db:seed      # Seed default data (permissions, owner, org workspace)
pnpm db:reset     # Full reset: drop → push → seed
pnpm db:studio    # Drizzle Studio GUI
```

Run a single test file: `pnpm test -- tests/unit/modules/auth/auth.service.test.ts`

## Project Overview

SAST Integration is a multi-tenant Static Application Security Testing (SAST) platform. It unifies multiple SAST scanners (Semgrep, Gitleaks, Flawfinder), enriches findings with AI-powered TP/FP verification (QLoRA fine-tuned models), and provides a structured workflow for triage and collaboration.

- **Framework**: Next.js 16 (App Router) — read `node_modules/next/dist/docs/` before writing code; APIs may differ from training data
- **Language**: TypeScript 5 (strict mode)
- **UI**: Ant Design 6 + CSS Modules
- **ORM**: Drizzle ORM with PostgreSQL 16
- **Auth**: JWT (jose) + bcryptjs with refresh token rotation & reuse detection
- **Validation**: Zod schemas everywhere (frontend + backend)
- **Queue**: pg-boss
- **Testing**: Vitest (unit + API e2e) + Playwright (UI e2e)
- **Package Manager**: pnpm

## Architecture

### Directory Layout

```
src/
├── app/                   # Next.js App Router
│   ├── (authenticated)/   # Routes requiring auth — workspace-scoped pages
│   ├── (public)/          # Public docs/landing pages
│   ├── (unauthenticated)/ # Auth pages (signin, signup, password reset)
│   └── api/v1/            # REST API route handlers (Next.js Route Handlers)
├── commons/               # Shared across frontend & server
│   ├── constants/         # App config, permissions, routes, security, theme, navigation
│   ├── schemas/           # Zod schemas (both client and server validation)
│   ├── types/             # TypeScript interfaces (api.ts, domain.ts)
│   └── tokens.ts          # Entity color maps (severity, verdict, status, role, scanner)
├── components/            # Shared UI components
│   ├── auth/              # Auth-related components (email verification banner)
│   ├── layout/            # Shells (app-shell, authenticated-shell, public-navbar)
│   ├── providers/         # AntdProvider, QueryProvider
│   └── shared/            # LoadingState, EmptyState, ErrorState, DataTable, PageHeader, etc.
├── config/                # antd-theme.ts, client-env.ts (NEXT_PUBLIC_*)
├── features/              # Page-level feature components (projects, scan, findings, teams, etc.)
├── lib/                   # Client-side utilities
│   ├── api/               # Axios client with auto-refresh interceptor, error helpers
│   ├── docs/              # MDX rendering for documentation pages
│   ├── hooks/             # Custom React hooks (useBreakpoint, usePermissions, etc.)
│   └── utils/             # formatDate, getInitials, roleLabel, export helpers
├── modules/               # Client-side data layer — one folder per domain
│   └── {domain}/          # api.ts, queries.ts (TanStack Query), hooks, types, keys
├── server/                # Server-only code (never imported by client)
│   ├── env.ts             # Zod-validated environment (lazy proxy pattern)
│   ├── db/client.ts       # Drizzle DB client (lazy proxy pattern)
│   ├── http/              # HTTP middleware layer
│   │   ├── authenticate.ts  # JWT verification + session check
│   │   ├── validate.ts      # Zod body validation (returns 422 on failure)
│   │   ├── response.ts      # Standardized JSON responses (meta.requestId + timestamp)
│   │   ├── errors.ts        # AppError, NotFoundError, UnauthorizedError, etc.
│   │   ├── request.ts       # Request parsing helpers (IP, user agent)
│   │   └── constants.ts     # Headers, error codes, pagination defaults
│   └── modules/           # Server business logic — one folder per domain
│       ├── auth/          # Auth service, JWT service, auth-flows, rate limiter, repository
│       ├── workspace/     # Workspace service, member service, repository, middleware
│       ├── mail/          # Mail service (console/smtp) + email templates
│       └── storage/       # File storage service (S3/Local/Cloudinary drivers)
├── types/                 # Global type declarations
└── utils/                 # Server-side utilities
drizzle/
├── schema/               # Drizzle table definitions (11 files: users, workspaces, auth, etc.)
├── migrations/            # SQL migration files + meta journal
├── seed.ts                # Seeds permissions, roles, owner, org workspace
├── reset.ts               # Drops all tables
└── migrate.ts             # Migration runner
tests/
├── unit/                  # Vitest unit tests (mirrors src/modules structure)
├── e2e/                   # Vitest API end-to-end tests
├── e2e-ui/                # Playwright browser tests
└── helpers/               # Test helpers (setup, factories)
```

### Server Layer Pattern (Service + Repository)

API routes are thin — they parse the request, delegate to services, return responses:

```
Route Handler (src/app/api/v1/.../route.ts)
  → authenticate(request)           # JWT + session validation
  → validateBody(request, schema)    # Zod validation → 422
  → {domain}Service.method(...)      # Business logic
  → ApiResponse.success(data)        # Standardized response
```

- **Services** (`src/server/modules/{domain}/services/`) contain business logic, throw `AppError` on failures
- **Repositories** (`src/server/modules/{domain}/repositories/`) contain raw DB queries, accept optional transaction context (`tx?: Tx`)
- **Services call repositories**, not the other way around

### Client Data Layer Pattern (Module)

Each domain in `src/modules/` follows React Query patterns:

```
{domain}/
├── api.ts       # API calls (uses axios client or mock data fallback)
├── keys.ts      # TanStack Query key factories
├── queries.ts   # Custom hooks: use{Entity}Query, use{Mutation}Mutation
├── types.ts     # Domain-specific TypeScript interfaces
└── index.ts     # Public API (re-exports)
```

### API Response Format

All API responses follow a consistent structure via `ApiResponse` (`src/server/http/response.ts`):

```typescript
// Success
{ success: true, message: string, data: T, meta: { requestId, timestamp, pagination? } }
// Error
{ success: false, message: string, data: null, meta: { requestId, timestamp }, error: { code, details } }
```

### HTTP Status Codes

- 200: Success (ApiResponse.success)
- 201: Created (ApiResponse.created)
- 204: No Content (ApiResponse.noContent — used for deletions)
- 401: Unauthorized (no token, invalid token, invalid session)
- 403: Forbidden (missing permissions, wrong role)
- 404: Not Found (entity doesn't exist)
- 409: Conflict (duplicate, already exists)
- 410: Gone (expired/used invitation)
- 422: Validation failure (Zod parse errors with field-level details)

### Auth & Security

- JWT access tokens (15m default) + refresh tokens (7d default) with rotation
- `/auth/refresh` requires custom header `x-refresh-request: 1` (CSRF protection via `SECURITY` constant)
- Refresh token rotation with reuse detection: each refresh generates a new `refreshTokenId`; presenting an old one triggers session deletion
- Session stored in DB, validated on every request (enables signout invalidation)
- Rate limiter available via `rateLimiter` service
- Production env validation rejects default/insecure secrets
- RBAC: 4 roles (Owner, Manager, Reviewer, Member), 24 permissions defined in `src/commons/constants/permissions.ts`
- Signup returns neutral response on duplicate emails (prevents enumeration)

### Workspace Modes

- `single`: One shared organization workspace, self-service signup disabled, invite-only
- `multiple` (default): Users sign up freely with personal workspace, invitations for org access
- Controlled by `WORKSPACE_MODE` env var

### Shared UI Components (Four States)

All views must handle Loading, Empty, Error, and Success using these shared components from `src/components/shared/`:
- `LoadingState` — loading spinner placeholder
- `EmptyState` — empty state with message and optional action
- `ErrorState` — error display with retry button
- `ErrorBoundary` — catches render errors
- `DataTable` — paginated table with sorting/filtering
- `PageHeader` — consistent page header with breadcrumbs

> **Rule**: Never return `null` or raw `<Spin />`. Never create custom loading/empty/error components — use the shared ones.

### Key Design Decisions

- **Lazy DB/env initialization**: Both `env` and `db` use a Proxy pattern for lazy initialization — errors surface at runtime, not import time
- **Feature flags**: Client-side via `NEXT_PUBLIC_FEATURE_FLAG_*` in `client-env.ts`; server-side elsewhere
- **Mock data**: Toggle via `NEXT_PUBLIC_MOCK_DATA=true` — API functions check `clientEnv.mockData` and return mock data instead of calling real endpoints
- **All Zod schemas in commons**: Shared between client validation and server-side validation
- **Mail provider**: Console (dev) or SMTP (production); selected via `MAIL_PROVIDER` env var

### Environment Variables

Required variables are validated via Zod in `src/server/env.ts`. Key vars:

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection URL |
| `JWT_SECRET` | Yes | — | Min 32 chars, production rejects known defaults |
| `NODE_ENV` | Yes | — | Must be `development`, `staging`, or `production` |
| `WORKSPACE_MODE` | No | `multiple` | `single` or `multiple` |
| `MAIL_PROVIDER` | No | `console` | `console` or `smtp` |

### Git Workflow

- **Branch from `dev`**: `feature/*`, `fix/*`, `docs/*`
- **Conventional Commits**: `type(scope): description` — types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`
- **PRs**: Use `.github/PULL_REQUEST_TEMPLATE/default.md` — squash merge to `dev`
- **Issues**: Use `.github/ISSUE_TEMPLATE/feature.yml` — treated as technical specifications

### Tool Call Parameter Rules (CRITICAL)

**Every tool call MUST include ALL required parameters.** Missing parameters cause InputValidationError and the tool call fails. Common mistakes to avoid:

| Tool | Required Parameters | Common Mistake |
|------|-------------------|----------------|
| `TaskUpdate` | `taskId` (string, e.g. "1") | Forgetting `taskId` entirely |
| `Agent` | `description`, `prompt` | Omitting `description` or `prompt` |
| `AskUserQuestion` | `questions` (array of objects with question, header, options, multiSelect) | Missing `questions` or wrong structure |
| `Write` | `file_path`, `content` | Missing either parameter |
| `Edit` | `file_path`, `old_string`, `new_string` | Missing any of the three |
| `NotebookEdit` | `notebook_path`, `new_source` | Missing required params |
| `Skill` | `skill` (exact skill name string) | Forgetting `skill` parameter entirely |
| `TaskCreate` | `subject`, `description` | Missing either parameter |

**Rules:**
1. ALWAYS include every required parameter in every tool call — no exceptions
2. NEVER generate a tool call without explicitly providing all required fields
3. When in doubt, list the required params before calling the tool
4. Use `taskId` as a STRING number ("1", "2", etc.) — not undefined/null
5. For Agent calls, always include both `description` (short) and `prompt` (detailed)
6. If you find yourself about to call a tool, STOP and verify you have all required params first

### AGENTS.md Rules

This repo has an `AGENTS.md` that sets mandatory standards: `[X]` only for checkboxes, every test needs a Purpose comment, zero TODO/FIXME comments, follow existing patterns, and all UI must handle Loading/Empty/Error/Success states.

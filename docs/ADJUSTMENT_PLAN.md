# Documentation Adjustment Plan

**Created**: June 2026
**Purpose**: Complete plan for README updates + docs/FLOW.md creation

---

## Table of Contents

1. [README.md Adjustments](#1-readmemd-adjustments)
2. [docs/PROJECT_STANDARDS.md Adjustments](#2-docsproject_standardsmd-adjustments)
3. [docs/DEPLOYMENT.md Adjustments](#3-docsdeploymentmd-adjustments)
4. [docs/queue.md Adjustments](#4-docsqueuemd-adjustments)
5. [docs/FLOW.md — Full Content](#5-docsflowmd--full-content)

---

## 1. README.md Adjustments

### 1.1 Core Capabilities Section

**Current** (line 21-29):
```markdown
- **Multi-Engine SAST Scanning** — Integration with Semgrep, Gitleaks, and Flawfinder.
- **AI-Assisted Verification** — QLoRA fine-tuned models to classify findings as True Positive / False Positive with per-model reasoning.
- **Multi-Workspace Architecture** — Isolated workspaces with granular RBAC (24 permissions across 4 roles: Owner, Manager, Reviewer, Member).
- **Self-Service & Invitation Workflows** — Personal workspace creation in multiple mode; email-based invitations with role assignment.
- **Production-Ready Hardening** — Strict environment validation, rejection of development secrets in production, and secure defaults.
- **SCM & CI Integration** — GitHub, GitLab, Gitea support with planned quality gates for PR blocking.
- **Reporting & Knowledge Base** — Exportable reports (PDF/XLSX) and integrated CWE/NVD knowledge base.
- **Operational Features** — Scheduled scans, webhooks, and audit-friendly member management.
```

**New**:
```markdown
- **Multi-Engine SAST Scanning** — Integration with Semgrep, Gitleaks, Flawfinder, Cppcheck, Trivy, and SARIF-compatible tools.
- **AI-Assisted Verification** — QLoRA fine-tuned models to classify findings as True Positive / False Positive with per-model reasoning, confidence scoring, and CWE mapping.
- **Multi-Workspace Architecture** — Isolated workspaces with granular RBAC (24 permissions across 4 roles: Owner, Manager, Reviewer, Member).
- **Self-Service & Invitation Workflows** — Personal workspace creation in multiple mode; email-based invitations with role assignment.
- **Production-Ready Hardening** — Strict environment validation, rejection of development secrets in production, and secure defaults.
- **SCM & CI Integration** — GitHub, GitLab, Gitea support with dual-flow architecture (external CI uploads + managed SCM scanning).
- **Scan Policies & Quality Gates** — Reusable scan configurations with scanner selection, AI toggle, severity thresholds, and pass/fail quality gate evaluation.
- **Team Management** — Create teams, assign members, link teams to projects for organized security ownership.
- **Knowledge Base** — Integrated CWE/NVD knowledge sources for enriched AI verification context.
- **Reporting & Export** — Exportable reports (PDF/XLSX/CSV) with AI verdict summaries, executive summaries, and compliance exports.
- **Scheduled Scans** — Cron-based recurring scan execution with timezone support.
- **Operational Features** — 30-day retention cleanup, webhooks, audit logs, and activity feeds.
```

### 1.2 Quick Start Section

**Current** (line 81-96):
```markdown
## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env.local

# Database
pnpm db:push       # Create tables
pnpm db:seed       # Seed owner + permissions (+ org workspace in single mode)

# Development
pnpm dev           # http://localhost:3000
pnpm db:studio     # Drizzle Studio
```
```

**New**:
```markdown
## Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Database
pnpm db:push       # Create tables
pnpm db:seed       # Seed owner + permissions (+ org workspace in single mode)

# Development
pnpm dev           # http://localhost:3000
pnpm db:studio     # Drizzle Studio
```
```

### 1.3 Testing Section

**Current** (line 107-116):
```markdown
### Testing

```bash
pnpm test          # Unit tests (Vitest)
pnpm test:coverage # Unit tests with coverage report
pnpm test:e2e      # E2E API tests (Vitest)
pnpm test:ui       # E2E UI tests (Playwright)
pnpm lint          # ESLint
pnpm build         # Production build
```
```

**New** (expand descriptions):
```markdown
### Testing

```bash
pnpm test            # Unit tests (Vitest)
pnpm test:coverage   # Unit tests with coverage report (target: ≥80% for server modules)
pnpm test:e2e        # E2E API tests (Vitest)
pnpm test:ui         # E2E UI tests (Playwright)
pnpm test:ui:headed  # Playwright in headed mode (visible browser)
pnpm lint            # ESLint
pnpm build           # Production build
```

See [docs/TESTING.md](docs/TESTING.md) for testing standards and conventions.
```

### 1.4 Documentation Section

**Current** (line 118-131):
```markdown
## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (41 tables) |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |
| [SCANNER_SETUP.md](docs/SCANNER_SETUP.md) | Scanner installation per OS |
| [SCANNER_ARCHITECTURE.md](docs/SCANNER_ARCHITECTURE.md) | Scan execution architecture |
| [SCAN-FLOW-SEQUENCE.md](docs/SCAN-FLOW-SEQUENCE.md) | Sequence diagrams for scan flows |
```

**New**:
```markdown
## Documentation

| Doc | Description |
|-----|-------------|
| [DATABASE.md](docs/DATABASE.md) | Schema reference (43 tables) |
| [ROADMAP.md](docs/ROADMAP.md) | Version plan & milestones |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards |
| [PROJECT_STANDARDS.md](docs/PROJECT_STANDARDS.md) | Architecture & patterns |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker deployment |
| [TESTING.md](docs/TESTING.md) | Testing standards & conventions |
| [UI_UX_GUIDELINES.md](docs/UI_UX_GUIDELINES.md) | UI/UX design standards |
| [FLOW.md](docs/FLOW.md) | Feature flow diagrams |
| [SCANNER_SETUP.md](docs/SCANNER_SETUP.md) | Scanner installation per OS |
| [SCANNER_ARCHITECTURE.md](docs/SCANNER_ARCHITECTURE.md) | Scan execution architecture |
| [SCAN-FLOW-SEQUENCE.md](docs/SCAN-FLOW-SEQUENCE.md) | Sequence diagrams for scan flows |
| [managed-scanning-and-scanner-policies.md](docs/managed-scanning-and-scanner-policies.md) | Dual-flow architecture |
| [dual-flow-architecture-cheatsheet.md](docs/dual-flow-architecture-cheatsheet.md) | One-page dual-flow reference |
| [upload-api.md](docs/upload-api.md) | External CI upload API |
| [queue.md](docs/queue.md) | Background queue system |
```

### 1.5 Database Schema Section

**Current** (line 19-20 in DATABASE.md):
```markdown
# Database Schema

PostgreSQL + Drizzle ORM | 41 tables | Single migration
```

**New**:
```markdown
# Database Schema

PostgreSQL + Drizzle ORM | 43 tables | Single migration
```

### 1.6 Database Table Groups Section

**Current** (lines 63-74 in DATABASE.md) — Scanning section missing `scan_uploads`:

**New** (update Scanning group):
```markdown
### Scanning (7 tables)

| Table | Purpose | Notes |
|-------|---------|----------|
| `scan_policies` | Reusable scan configs (profile, scanners, AI toggle) | `scanners` is jsonb array validated against `SUPPORTED_SCANNERS` |
| `scans` | Scan executions | Has `origin` (`'managed'` \| `'external_upload'`) and optional `policy_id` |
| `scan_results` | Raw scanner output per scan | Stores `file_key` (in object storage) + `parsed_summary` |
| `scan_uploads` | Audit trail of every CI upload | Records which credential was used |
| `schedules` | Recurring scan schedules (cron) | References `policy_id` |
| `quality_gates` | Pass/fail rules per workspace | — |
| `quality_gate_results` | Per-scan gate evaluation | — |
```

### 1.7 Current Status Section

**Current** (line 63-76):
```markdown
## Current Status

The platform has completed the foundational architecture and the complete multi-workspace collaboration layer (M4).

| Milestone | Version | Status |
|-----------|---------|--------|
| M1: Project Setup | v0.1.0 | ✅ Complete |
| M2: Database & Schema (41 tables) | v0.2.0 | ✅ Complete |
| M3: Authentication & Sessions | v0.3.0 | ✅ Complete |
| M4: Workspace Management & Collaboration | v0.4.0 | ✅ Complete |
| M5: Projects, Repositories & SCM | v0.5.0 | In Progress |
| M6–M10 | — | Planned |
```

**New**:
```markdown
## Current Status

The platform has completed the foundational architecture, the complete multi-workspace collaboration layer (M4), and the dual-flow scanning foundation (M5).

| Milestone | Version | Status |
|-----------|---------|--------|
| M1: Project Setup | v0.1.0 | ✅ Complete |
| M2: Database & Schema (43 tables) | v0.2.0 | ✅ Complete |
| M3: Authentication & Sessions | v0.3.0 | ✅ Complete |
| M4: Workspace Management & Collaboration | v0.4.0 | ✅ Complete |
| M5: Projects, Repositories & SCM (Dual-Flow) | v0.5.0 | ✅ Complete |
| M6: Scanning Pipeline & Queue Processing | v0.6.0 | Planned |
| M7: Findings Management & AI Verification | v0.7.0 | Planned |
| M8: Reporting, Dashboard & Notifications | v0.8.0 | Planned |
| M9: Advanced RBAC, Teams & Audit | v0.9.0 | Planned |
| M10: Deployment, UAT & Thesis Defense | v1.0.0 | Target (June 2026) |
```

---

## 2. docs/PROJECT_STANDARDS.md Adjustments

### 2.1 Testing Strategy Section

**Current** (lines 272-280):
```markdown
## Testing Strategy

> **Status**: Placeholder — to be defined in v0.2.0

Planned approach:
- **Unit**: Services & utilities (Vitest)
- **Integration**: API routes with test database
- **E2E**: Critical user flows (Playwright)
- **Coverage target**: 80% for server modules
```

**New**:
```markdown
## Testing Strategy

See [TESTING.md](./TESTING.md) for complete testing standards and conventions.

- **Unit**: Services & utilities (Vitest) — `pnpm test`
- **Integration**: API routes with test database — `pnpm test:e2e`
- **E2E**: Critical user flows (Playwright) — `pnpm test:ui`
- **Coverage target**: Lines ≥ 80% for `src/server/modules/**/*.ts`
```

### 2.2 Data Flow Section

**Current** (lines 159-174):
```markdown
## Data Flow

```
Page (app/) → Feature UI (features/) → Query Hook (modules/) → Client API → API Route (app/api/) → Service (server/) → Repository (server/) → Database
```

| Layer | File Location | Responsibility |
|-------|--------------|----------------|
| Page | `app/**/page.tsx` | Compose features, fetch data |
| Feature UI | `features/*/` | Render UI, handle interactions |
| Query Hook | `modules/*/queries/` | TanStack Query cache layer |
| Client API | `modules/*/api/` | HTTP calls to API routes |
| API Route | `app/api/v1/**/` | Validate input, call service |
| Service | `server/*/services/` | Business logic orchestration |
| Repository | `server/*/repositories/` | Database queries (Drizzle) |
| Database | PostgreSQL | Data persistence |
```

**New**:
```markdown
## Data Flow

```
Page (app/) → Feature UI (features/) → Query Hook (modules/) → Client API → API Route (app/api/) → Service (server/) → Repository (server/) → Database
                                                                                              ↓
                                                                                        Queue (pg-boss)
                                                                                              ↓
                                                                                          Worker → Parser → Finding Service → DB
                                                                                              ↓
                                                                                      Storage (Local/S3/Cloudinary)
```

| Layer | File Location | Responsibility |
|-------|--------------|----------------|
| Page | `app/**/page.tsx` | Compose features, fetch data |
| Feature UI | `features/*/` | Render UI, handle interactions |
| Query Hook | `modules/*/queries/` | TanStack Query cache layer |
| Client API | `modules/*/api/` | HTTP calls to API routes |
| API Route | `app/api/v1/**/` | Validate input, call service |
| Service | `server/*/services/` | Business logic orchestration |
| Repository | `server/*/repositories/` | Database queries (Drizzle) |
| Database | PostgreSQL | Data persistence |
| Queue | `server/modules/queue/` | Background job processing (pg-boss) |
| Worker | `server/modules/queue/jobs/` | Async job handlers (parse, AI verify, cleanup) |
| Storage | `server/modules/storage/` | File storage (Local/S3/Cloudinary) |
```

---

## 3. docs/DEPLOYMENT.md Adjustments

### 3.1 Queue Worker Section

**Current** (lines 168-178):
```markdown
## Queue Worker

Background job processing for scan execution using pg-boss (PostgreSQL-based):

```bash
# Start worker
pnpm queue:worker

# Start worker (production)
pnpm queue:worker --concurrency 4
```
```

**New**:
```markdown
## Queue Workers

Background job processing is built into the Next.js server process using pg-boss (PostgreSQL-based). Workers are registered automatically at server startup via `src/instrumentation.ts` — no separate worker process is needed.

### Registered Workers

| Job Name | Handler | Purpose |
|----------|---------|---------|
| `parse-scan-result` | `processParseScanResultJob` | Parse uploaded scan results, create findings |
| `cleanup-old-scan-files` | `processCleanupOldScanFilesJob` | 30-day retention cleanup for raw files |
| `run-managed-scan` | `processManagedScanJob` | Execute managed SCM scans |
| `trigger-scheduled-managed-scan` | `processScheduledManagedScanJob` | Trigger cron-based scheduled scans |

### Scheduled Jobs

- `cleanup-old-scan-files` runs daily at 03:00 UTC
- Manual trigger: `POST /api/v1/retention/cleanup` (supports `?dryRun=true`)

### Running

```bash
# Development — workers start with the app
pnpm dev

# Production — workers start with the app
pnpm start
```

Workers run in the same Node.js process as the Next.js server. No separate worker process or additional infrastructure is required.
```

### 3.2 Production Checklist Section

**Current** (lines 182-197):
```markdown
## Production Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] Storage directories created (`/storage/{artifacts,backups,logs}`)
- [ ] NODE_ENV=production
- [ ] JWT_SECRET is a strong random value (32+ chars)
- [ ] Health check returns 200
- [ ] Queue worker running (pg-boss)
- [ ] Scanner runner running (PM2 or Docker)
- [ ] HTTPS configured (reverse proxy)
- [ ] Rate limiting enabled
- [ ] Error monitoring connected (Sentry)
- [ ] Backup strategy for PostgreSQL
- [ ] Retention cleanup cron configured
- [ ] Log aggregation configured
```

**New**:
```markdown
## Production Checklist

- [ ] All environment variables set (see `.env.example`)
- [ ] Database migrations applied (`pnpm db:migrate`)
- [ ] Storage directories created (`/storage/{artifacts,reports}`)
- [ ] NODE_ENV=production
- [ ] JWT_SECRET is a strong random value (32+ chars)
- [ ] APP_URL points to production domain (not localhost)
- [ ] MAIL_PROVIDER=smtp (not console)
- [ ] Health check returns 200 (`GET /api/v1/health`)
- [ ] Queue workers registered (automatic with server startup)
- [ ] HTTPS configured (reverse proxy)
- [ ] Rate limiting enabled
- [ ] Backup strategy for PostgreSQL
- [ ] Retention cleanup cron verified (runs at 03:00 UTC)
```

### 3.3 Environment Variables Section

**Current** (lines 84-109) — Missing some vars:

**New** (add missing vars to table):
```markdown
| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| DATABASE_URL | Yes | — | PostgreSQL connection string |
| JWT_SECRET | Yes | — | Secret for JWT signing (jose). Must not be a default/example value in production |
| APP_URL | Yes | http://localhost:3000 | Application base URL. Must not be localhost in production |
| WORKSPACE_MODE | No | multiple | `single` = one org workspace, invitation-only; `multiple` = open self-signup + per-user workspaces |
| MAIL_PROVIDER | No | console | `console` (dev) or `smtp`. `console` is rejected in production |
| OWNER_EMAIL / OWNER_PASSWORD / OWNER_NAME | No* | admin@sast.local / ChangeMe123! / Owner | Bootstrap owner for `db:seed`. *Required (non-default) in production |
| ORG_NAME / ORG_SLUG | No | SAST Organization / sast-org | Seeded org workspace (single mode) |
| PORT | No | 3000 | Server port |
| NODE_ENV | No | development | Environment mode |
| STORAGE_PROVIDER | No | local | File storage provider: `local`, `s3`, `cloudinary` |
| STORAGE_LOCAL_PATH | No | ./storage/uploads | Local file storage path |
| SCANNER_MODE | No | local | Scanner execution mode |
| RETENTION_DAYS | No | 30 | Days to keep raw scan files |
```

---

## 4. docs/queue.md Adjustments

### 4.1 Important Job Names Section

**Current** (lines 17-21):
```markdown
## Important Job Names

Defined in `src/commons/constants/scan.ts` and `src/server/modules/scan/constants.ts`:

- `parse-scan-result` — The main job that downloads a raw report from storage, parses it, creates findings with deduplication (via `finding_groups`), and updates `scan_results.parsed_summary`.
- `cleanup-old-scan-files` — Daily retention job (03:00 UTC). Deletes raw scanner files older than `RETENTION_DAYS` (default 30) from object storage and clears `file_key` / `file_size`. Supports dry-run mode. Can be manually triggered via `/api/v1/retention/cleanup?dryRun=true`.
```

**New**:
```markdown
## Important Job Names

Defined in `src/commons/constants/queue.ts` and `src/server/modules/scan/constants.ts`:

- `parse-scan-result` — Downloads a raw report from storage, parses it, creates findings with deduplication (via `finding_groups`), and updates `scan_results.parsed_summary`.
- `cleanup-old-scan-files` — Daily retention job (03:00 UTC). Deletes raw scanner files older than `RETENTION_DAYS` (default 30) from object storage and clears `file_key` / `file_size`. Supports dry-run mode. Can be manually triggered via `/api/v1/retention/cleanup?dryRun=true`.
- `run-managed-scan` — Executes a managed SCM scan: clones repository, runs scanners from attached policy, uploads results, enqueues parse jobs.
- `trigger-scheduled-managed-scan` — Cron-triggered job that finds due schedules and enqueues `run-managed-scan` jobs.
- `ai-verify-findings` — Verifies findings using AI models (enqueued after parsing if policy.ai_verification = 'enabled').
```

### 4.2 Worker Registration Section

**Current** (lines 23-39):
```markdown
## Worker Registration

Workers are registered once when the Next.js server starts in Node.js runtime (in `src/instrumentation.ts`):

```ts
// parse results
await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, async (job) => {
  await processParseScanResultJob(job);
});

// retention cleanup (also scheduled daily at 03:00)
await queue.work(CLEANUP_OLD_SCAN_FILES_JOB_NAME, async () => {
  await processCleanupOldScanFilesJob();
});

await queue.schedule(CLEANUP_OLD_SCAN_FILES_JOB_NAME, '0 3 * * *');
```

The retention job can also be triggered manually (with optional `dryRun`). See the [Managed Scanning architecture doc](./managed-scanning-and-scanner-policies.md).
```

**New**:
```markdown
## Worker Registration

Workers are registered once when the Next.js server starts in Node.js runtime (in `src/instrumentation.ts`):

```ts
// parse results
await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, processParseScanResultJob);

// retention cleanup (also scheduled daily at 03:00)
await queue.work(CLEANUP_OLD_SCAN_FILES_JOB_NAME, processCleanupOldScanFilesJob);
await queue.schedule(CLEANUP_OLD_SCAN_FILES_JOB_NAME, '0 3 * * *');

// managed scan execution
await queue.work(QUEUE_JOBS.RUN_MANAGED_SCAN, processManagedScanJob);

// scheduled scan trigger
await queue.work(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, processScheduledManagedScanJob);
```

Workers run in the same process as the Next.js server — no separate worker process needed.

The retention job can also be triggered manually (with optional `dryRun`). See the [Managed Scanning architecture doc](./managed-scanning-and-scanner-policies.md).
```

### 4.3 Add AI Verification Job Section

**After line 39, add new section**:

```markdown
### AI Verification Job

- **Job name**: `ai-verify-findings`
- **Handler**: `processAiVerifyJob` in `jobs/ai-verify-finding.job.ts`
- **Trigger**: Enqueued after parsing completes (if `policy.ai_verification = 'enabled'`)
- **Logic**: Calls `aiVerificationService.batchVerify()` to verify all findings in a scan
- **Output**: Stores verification results in `ai_verifications` table, updates finding status
- **Data**: `{ scanId, modelId }`
```

### 4.4 Current Limitations Section

**Current** (lines 75-79):
```markdown
## Current Limitations (as of 2026-06)

- Only one worker type exists (`parse-scan-result`).
- No dead-letter queue handling beyond pg-boss defaults.
- No rate limiting or priority tuning yet (all parse jobs use default priority).
```

**New**:
```markdown
## Current Limitations (as of 2026-06)

- Four worker types registered: `parse-scan-result`, `cleanup-old-scan-files`, `run-managed-scan`, `trigger-scheduled-managed-scan`
- AI verification job (`ai-verify-findings`) is enqueued dynamically after parsing
- No dead-letter queue handling beyond pg-boss defaults
- No rate limiting or priority tuning yet (all jobs use default priority)
```

---

## 5. docs/FLOW.md — Full Content

This is the new file to create. Full content below.

---

**File**: `docs/FLOW.md`

```markdown
# Feature Flows

**Purpose**: End-to-end flow documentation for every major feature in SAST Integration.
Each section describes the trigger, steps, decision points, key files, and database tables.

**Last Updated**: June 2026

---

## Table of Contents

1. [Authentication Flow](#1-authentication-flow)
2. [Workspace Management Flow](#2-workspace-management-flow)
3. [Project Management Flow](#3-project-management-flow)
4. [Repository Management Flow](#4-repository-management-flow)
5. [External CI Upload Flow](#5-external-ci-upload-flow)
6. [Managed SCM Scan Flow](#6-managed-scm-scan-flow)
7. [Finding Management Flow](#7-finding-management-flow)
8. [AI Verification Flow](#8-ai-verification-flow)
9. [Reporting Flow](#9-reporting-flow)
10. [Team Management Flow](#10-team-management-flow)
11. [Queue System Flow](#11-queue-system-flow)
12. [Quality Gate Flow](#12-quality-gate-flow)
13. [Scan Policy Flow](#13-scan-policy-flow)
14. [Knowledge Base Flow](#14-knowledge-base-flow)
15. [Storage Flow](#15-storage-flow)

---

## 1. Authentication Flow

### 1.1 Sign Up

**Trigger**: User submits registration form at `/auth/signup`

**Steps**:
1. Client sends `POST /api/v1/auth/signup` with email, password, name
2. Zod validates input (password: 8-128 chars, uppercase+lowercase+digit+special)
3. `authService.signup()` checks for duplicate email (neutral — no enumeration)
4. Hash password with bcryptjs (12 salt rounds)
5. Create user record in `users` table
6. Create personal workspace (if `WORKSPACE_MODE=multiple`)
7. Add user as owner of personal workspace
8. Create email verification token
9. Send verification email
10. Return user ID and email

**Key Files**:
- `src/app/api/v1/auth/signup/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `signup()`
- `src/server/modules/auth/repositories/auth.repository.ts`
- `src/server/modules/auth/schemas/auth.schema.ts`

**Database Tables**: `users`, `workspaces`, `workspace_members`, `email_verification_tokens`

---

### 1.2 Sign In

**Trigger**: User submits login form at `/auth/signin`

**Steps**:
1. Client sends `POST /api/v1/auth/signin` with email, password
2. Rate limiter checks attempt count (5 attempts / 15 min window)
3. `authService.signin()` finds user by email
4. Compare password with bcryptjs
5. Create session record with JWT IDs
6. Sign access token (short-lived, 15m) and refresh token (long-lived, 7d)
7. Set refresh token as httpOnly cookie
8. Return access token + user info + current workspace

**Key Files**:
- `src/app/api/v1/auth/signin/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `signin()`
- `src/server/modules/auth/services/jwt.service.ts`
- `src/server/modules/auth/services/rate-limiter.ts`
- `src/server/modules/auth/cookie.ts`

**Database Tables**: `sessions`, `users`, `workspace_members`, `workspaces`

---

### 1.3 Token Refresh

**Trigger**: Access token expires (15m) or client requests refresh

**Steps**:
1. Client sends `POST /api/v1/auth/refresh` with `x-refresh-request: 1` header
2. Read refresh token from httpOnly cookie
3. Verify refresh token signature
4. Find session by `sessionId` from token payload
5. **Reuse detection**: Compare `refreshTokenId` from token with stored `currentRefreshTokenId`
   - Match → Generate new refresh token ID, update session
   - Mismatch → **Delete session** (potential token theft)
6. Sign new access token
7. Return new access token

**Key Files**:
- `src/app/api/v1/auth/refresh/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `refresh()`
- `src/server/modules/auth/services/jwt.service.ts`

**Database Tables**: `sessions`

---

### 1.4 Password Reset

**Trigger**: User clicks "Forgot password" at `/auth/forgot-password`

**Steps**:
1. Client sends `POST /api/v1/auth/forgot-password` with email
2. `authFlowsService.forgotPassword()` finds user (silent if not found)
3. Create `password_reset_tokens` record (1 hour expiry)
4. Send reset email with token link
5. User clicks link → `/auth/reset-password?token=xxx`
6. User submits new password
7. Client sends `POST /api/v1/auth/reset-password` with token + new password
8. Validate token, update password hash
9. **Invalidate all user sessions** (security)
10. User must sign in again

**Key Files**:
- `src/app/api/v1/auth/forgot-password/route.ts`
- `src/app/api/v1/auth/reset-password/route.ts`
- `src/server/modules/auth/services/auth-flows.service.ts` → `forgotPassword()`, `resetPassword()`
- `src/server/modules/mail/mail.service.ts`
- `src/server/modules/mail/templates.ts`

**Database Tables**: `password_reset_tokens`, `users`, `sessions`

---

### 1.5 Email Verification

**Trigger**: User clicks verification link from email

**Steps**:
1. Verification link: `/auth/verify-email?token=xxx`
2. Client sends `POST /api/v1/auth/verify-email` with token
3. `authFlowsService.verifyEmail()` validates token
4. Set `emailVerifiedAt` on user record
5. Mark token as used

**Key Files**:
- `src/app/api/v1/auth/verify-email/route.ts`
- `src/server/modules/auth/services/auth-flows.service.ts` → `verifyEmail()`

**Database Tables**: `email_verification_tokens`, `users`

---

### 1.6 Workspace Invitation

**Trigger**: Manager+ sends invite at `/[workspace]/members`

**Steps**:
1. Manager sends `POST /api/v1/auth/invite` with email + role
2. `authService.invite()` creates invitation record (7-day expiry)
3. Send invitation email with accept link
4. Invitee clicks link → `/auth/invite?token=xxx`
5. If new user: account + personal workspace created
6. User added to workspace with invited role
7. Invitation marked as accepted

**Key Files**:
- `src/app/api/v1/auth/invite/route.ts`
- `src/app/api/v1/auth/invite/accept/route.ts`
- `src/server/modules/auth/services/auth.service.ts` → `invite()`, `acceptInvite()`
- `src/server/modules/mail/templates.ts` → `workspaceInviteTemplate()`

**Database Tables**: `workspace_invitations`, `users`, `workspaces`, `workspace_members`

---

## 2. Workspace Management Flow

### 2.1 Create Workspace (Multiple Mode)

**Trigger**: User creates workspace at `/workspaces`

**Steps**:
1. Client sends `POST /api/v1/workspaces` with name, slug, description, type
2. Validate slug uniqueness
3. Create workspace record (type: personal or organization)
4. Add creator as owner
5. Switch user's current workspace to new workspace

**Key Files**:
- `src/app/api/v1/workspaces/route.ts`
- `src/server/modules/workspace/workspace.service.ts` → `create()`
- `src/server/modules/workspace/workspace.repository.ts`

**Database Tables**: `workspaces`, `workspace_members`, `users`

---

### 2.2 Switch Workspace

**Trigger**: User selects different workspace from dropdown

**Steps**:
1. Client sends `PATCH /api/v1/users/me` with `{ currentWorkspaceId }`
2. Verify user is member of target workspace
3. Update `users.current_workspace_id`
4. Client refetches session with new workspace context

**Key Files**:
- `src/app/api/v1/users/me/route.ts`
- `src/server/modules/workspace/workspace.service.ts` → `switchWorkspace()`
- `src/modules/workspace/queries.ts` → `useSwitchWorkspaceMutation()`

**Database Tables**: `users`

---

### 2.3 Member Management

**Trigger**: Manager+ manages members at `/[workspace]/members`

**Change Role**:
1. Owner sends `PATCH /api/v1/workspaces/[id]/members/[userId]` with new role
2. Validate: cannot change own role, cannot assign owner, cannot change owner
3. Update `workspace_members.role`
4. Record in audit log

**Remove Member**:
1. Manager+ sends `DELETE /api/v1/workspaces/[id]/members/[userId]`
2. Validate: cannot remove self, cannot remove owner
3. Delete from `workspace_members`

**Key Files**:
- `src/app/api/v1/workspaces/[id]/members/route.ts`
- `src/server/modules/workspace/member.service.ts` → `changeRole()`, `removeMember()`
- `src/server/modules/workspace/workspace.middleware.ts` → `requireWorkspaceRole()`

**Database Tables**: `workspace_members`, `audit_logs`

---

## 3. Project Management Flow

### 3.1 Create Project

**Trigger**: Manager+ creates project at `/[workspace]/projects/new`

**Steps**:
1. Client sends `POST /api/v1/workspaces/[id]/projects` with name, description, etc.
2. Auto-generate slug from name, check uniqueness
3. Create project record
4. Add creator as project member

**Key Files**:
- `src/app/api/v1/workspaces/[id]/projects/route.ts`
- `src/server/modules/project/services/project.service.ts` → `create()`
- `src/server/modules/project/repositories/project.repository.ts`

**Database Tables**: `projects`, `project_members`

---

### 3.2 Project API Tokens

**Trigger**: Manager+ creates CI token at project settings

**Steps**:
1. Manager sends `POST /api/v1/projects/[projectId]/api-tokens` with name
2. Generate raw token with `sast_p_` prefix
3. Hash token with bcryptjs
4. Store hash + prefix in `project_api_tokens`
5. Return raw token **once** (never stored in plaintext)

**Key Files**:
- `src/app/api/v1/projects/[projectId]/api-tokens/route.ts`
- `src/server/modules/project/repositories/project-api-token.repository.ts` → `create()`

**Database Tables**: `project_api_tokens`

---

## 4. Repository Management Flow

### 4.1 SCM Repository (connection_type = 'scm')

**Trigger**: User connects SCM provider at `/[workspace]/integrations/source-control`

**Steps**:
1. User configures GitHub/GitLab/Gitea credentials via `ConfigureModal`
2. System stores credentials in `source_controls` table
3. User imports repositories from provider
4. Repository records created with `connection_type = 'scm'`
5. Webhooks can be provisioned for automated scanning

**Key Files**:
- `src/features/source-control/ConfigureModal.tsx`
- `src/features/source-control/SetupGuideDrawer.tsx`
- `src/server/modules/project/repositories/project.repository.ts` → `attachRepository()`

**Database Tables**: `source_controls`, `repositories`

---

### 4.2 External Repository (connection_type = 'external')

**Trigger**: First CI upload with new repository URL

**Steps**:
1. CI pipeline uploads to `POST /api/v1/projects/[projectId]/scans/upload`
2. `scanUploadService.resolveOrCreateExternalRepository()` checks for existing repo
3. If not found: create repository with `connection_type = 'external'`
4. No SCM credentials required — results-only flow

**Key Files**:
- `src/server/modules/scan/upload.service.ts` → `resolveOrCreateExternalRepository()`
- `src/server/modules/project/constants.ts` → `REPOSITORY_CONNECTION_TYPES`

**Database Tables**: `repositories`

---

### 4.3 Policy Assignment

**Trigger**: Manager attaches scan policy to repository

**Steps**:
1. User selects policy in `RepositoryScanPolicy` component
2. `PUT /api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/policy`
3. Validate: workspace ownership, policy exists, repository is SCM type
4. Update `repositories.current_policy_id`

**Key Files**:
- `src/app/api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/policy/route.ts`
- `src/server/modules/scan/services/scan-policy.service.ts` → `attachPolicyToRepository()`

**Database Tables**: `repositories`

---

## 5. External CI Upload Flow

**Trigger**: CI pipeline sends `POST /api/v1/projects/[projectId]/scans/upload`

### Full Sequence

1. **Authenticate** — Verify Project API Token (`sast_p_...`) or User JWT
2. **Validate** — Branch, commit, at least one scanner file
3. **Validate Scanners** — `validateScanners()` against `SUPPORTED_SCANNERS`
4. **Resolve Repository** — Find or auto-create external repository
5. **Create Scan** — Insert with `origin: 'external_upload'`
6. **Create Audit** — Insert `scan_uploads` record (who uploaded what)
7. **Process Files** (per scanner):
   a. Upload raw file to storage (Local/S3/Cloudinary)
   b. If file > 5MB → enqueue async parse job
   c. If file ≤ 5MB → parse synchronously
8. **Parse Results** — Dispatch to scanner-specific parser
9. **Create Findings** — Deduplicate via `finding_groups` fingerprint
10. **Complete** — Update scan status to `completed`

### Sync vs Async Decision

```
file.size > ASYNC_PARSE_THRESHOLD_BYTES (5MB)?
    ├── YES → enqueue('parse-scan-result', { scanResultId }) → background worker
    └── NO  → parse immediately → return findings in response
```

### Supported Parsers

| Scanner | Format | Parser |
|---------|--------|--------|
| semgrep | JSON | `parseSemgrep()` |
| gitleaks | JSON | `parseGitleaks()` |
| trivy | JSON | `parseTrivy()` |
| flawfinder | Text | `parseFlawfinder()` |
| cppcheck | XML | `parseCppcheck()` |
| sarif | JSON | `parseSarifStub()` |

### Key Files

- `src/app/api/v1/projects/[projectId]/scans/upload/route.ts`
- `src/server/modules/scan/upload.service.ts` → `uploadResults()`
- `src/server/modules/scan/parsers/index.ts` → `parseScanResult()`
- `src/server/modules/scan/services/finding.service.ts` → `createManyWithDedup()`
- `src/server/modules/scan/services/finding.fingerprint.ts` → `generateFindingFingerprint()`

### Database Tables

`repositories`, `scans`, `scan_results`, `scan_uploads`, `finding_groups`, `findings`

---

## 6. Managed SCM Scan Flow

**Trigger**: Manual trigger, webhook, or schedule

### 6.1 Manual Trigger

1. User clicks "Run Scan" in UI
2. `POST /api/v1/workspaces/[id]/projects/[projectId]/repositories/[repoId]/scans/run`
3. `managedScanService.triggerManualScan()` validates repository (must be SCM + have policy)
4. Create scan record (status: `queued`)
5. Enqueue `run-managed-scan` job
6. Return scan ID immediately

### 6.2 Queue Worker Execution

1. `processManagedScanJob()` picks up job
2. Update scan status to `processing`
3. Shallow clone repository (`git clone --depth 1`)
4. For each scanner in policy:
   a. Check availability (`checkScannerAvailability()`)
   b. If unavailable → skip with warning
   c. Run scanner CLI (`execFile`)
   d. Upload output to storage
   e. Create `scan_results` record
   f. Enqueue `parse-scan-result` job
5. Cleanup temp directory
6. Evaluate results: if all failed → `failed`, else → `completed`

### 6.3 Scheduled Trigger

1. Cron job fires (`trigger-scheduled-managed-scan`)
2. `processScheduledManagedScanJob()` finds due schedules
3. For each due schedule: clone repo, run scanners (same as manual)

### Graceful Degradation

Each scanner is checked independently. Failures are isolated:

```
for scanner in [semgrep, gitleaks, trivy]:
    if not available(scanner):
        log warning, skip
        continue
    try:
        runScanner(scanner)
        record success
    catch error:
        log error, record failure
        continue  // don't stop the loop
```

### Key Files

- `src/server/modules/scan/services/managed-scan.service.ts` → `triggerManualScan()`, `processManagedScanJob()`
- `src/server/modules/scan/scanner-availability.ts` → `checkScannerAvailability()`
- `src/server/modules/scan/scanners.ts` → `SCANNER_COMMANDS`
- `src/server/modules/queue/jobs/parse-scan-result.job.ts`

### Database Tables

`repositories`, `scans`, `scan_results`, `scan_policies`, `schedules`, `finding_groups`, `findings`

---

## 7. Finding Management Flow

### 7.1 Finding Creation (via Scan)

**Trigger**: Parser produces findings from scan results

**Steps**:
1. Parser outputs `NewFinding[]` with severity, rule, file, line, message
2. `findingService.createManyWithDedup()` processes each finding:
   a. Generate fingerprint: `SHA-256(rule + file_path + line_number + message[:180])`
   b. Find or create `finding_groups` row by fingerprint
   c. Insert `findings` row linked to group
3. Update `finding_groups.first_seen_at` / `last_seen_at`

### 7.2 Status Workflow

```
open → verified → fixed
open → false_positive
open → ignored
```

**Steps**:
1. User sends `PATCH /api/v1/findings/[id]/status` with new status
2. `findingService.updateStatus()` validates transition
3. Update `findings.status`
4. Insert `finding_history` record (audit trail)

### 7.3 Assignment

**Steps**:
1. User sends `PATCH /api/v1/findings/[id]/assign` with userId (or null)
2. Update `findings.assigned_to`

### 7.4 Bulk Operations

**Steps**:
1. User selects multiple findings in `FindingsTable`
2. Bulk actions: Accept, Re-verify, Assign
3. Client sends bulk update request

### Key Files

- `src/app/api/v1/findings/route.ts`
- `src/app/api/v1/findings/[id]/status/route.ts`
- `src/app/api/v1/findings/[id]/assign/route.ts`
- `src/server/modules/scan/services/finding.service.ts`
- `src/server/modules/scan/repositories/finding.repository.ts`
- `src/features/findings/FindingsTable.tsx`
- `src/features/findings/FindingDetailDrawer.tsx`

### Database Tables

`findings`, `finding_groups`, `finding_history`

---

## 8. AI Verification Flow

**Trigger**: After scan parsing (if `policy.ai_verification = 'enabled'`)

### Full Sequence

1. **Enqueue** — After parsing, enqueue `ai-verify-findings` job
2. **Load Findings** — `aiVerificationService.batchVerify()` gets all findings for scan
3. **Load Model** — Get AI model config from `ai_models` table (primary or fallback)
4. **For Each Finding**:
   a. Build prompt using `PROMPT_TEMPLATES.strict` or `.balanced`
   b. Include: code snippet, rule, file path, CWE context
   c. Call AI model (currently heuristic simulation, future: Ollama/OpenAI-compatible)
   d. Parse response: verdict (TP/FP), confidence, reasoning, CWE mapping, fix suggestion
   e. Store in `ai_verifications` table
   f. Update `findings.status` to `verified` if verdict is TP
5. **Update Summary** — Store `aiVerifiedCount` in `scan_results.parsed_summary`

### AI Model Configuration

| Field | Purpose |
|-------|---------|
| `provider` | `ollama` / `openai_compatible` / `groq` |
| `base_url` | Model endpoint URL |
| `role` | `primary` / `fallback` |
| `priority` | Ordering for fallback chain |
| `prompt_preset` | `strict` / `balanced` / `custom` |

### Prompt Templates

**Strict** (90% accuracy on Qwen2.5-Coder-SVA):
```
Analyze the following code finding. Is this a TRUE POSITIVE or FALSE POSITIVE?
[Code snippet]
[Rule description]
[CWE context]
```

**Balanced** (88% accuracy on Llama3):
```
Review this security finding...
```

### Key Files

- `src/server/modules/scan/services/ai-verification.service.ts` → `verifyFinding()`, `batchVerify()`
- `src/server/modules/scan/repositories/ai-verification.repository.ts`
- `src/server/modules/queue/jobs/ai-verify-finding.job.ts`
- `src/features/scan/AiVerificationBadge.tsx`
- `src/features/scan/FindingItem.tsx`

### Database Tables

`ai_models`, `ai_verifications`, `findings`, `scan_results`

---

## 9. Reporting Flow

**Trigger**: User generates report at `/[workspace]/reports`

### Steps

1. User selects report type and format
2. `POST /api/v1/reports` with type, filters, format
3. `reportService.generate()` creates report record
4. Gather finding statistics (`reportRepository.getFindingStats()`)
5. Gather AI verification stats (`reportRepository.getAiVerificationStats()`)
6. Generate content based on type:
   - `ai_verdict_summary` — TP/FP counts, confidence
   - `detailed_findings` — Finding counts by severity/status
   - `executive_summary` — High-level metrics
   - `compliance_export` — CSV with severity counts
7. Upload generated file to storage
8. Update report record with file info
9. Report expires in 30 days

### Key Files

- `src/app/api/v1/reports/route.ts`
- `src/server/modules/report/services/report.service.ts`
- `src/server/modules/report/repositories/report.repository.ts`
- `src/features/reports/ReportPreviewDrawer.tsx`

### Database Tables

`reports`, `storage_files`, `findings`, `finding_groups`, `ai_verifications`

---

## 10. Team Management Flow

### 10.1 Create Team

**Trigger**: Manager+ creates team at `/[workspace]/teams/new`

**Steps**:
1. Client sends POST with name, slug, description, memberIds
2. Create team record
3. Add members with roles (admin/contributor)

### 10.2 Assign Team to Project

**Trigger**: Manager assigns team in project form

**Steps**:
1. In `ProjectForm`, select teams
2. Create `project_teams` records

### Key Files

- `src/features/teams/TeamsTable.tsx`
- `src/features/teams/TeamForm.tsx`
- `src/modules/teams/api.ts`

### Database Tables

`teams`, `team_members`, `project_teams`

---

## 11. Queue System Flow

### Job Types

| Job Name | Handler | Trigger |
|----------|---------|---------|
| `parse-scan-result` | `processParseScanResultJob` | After scan upload or managed scan |
| `cleanup-old-scan-files` | `processCleanupOldScanFilesJob` | Daily at 03:00 UTC + manual trigger |
| `run-managed-scan` | `processManagedScanJob` | Manual trigger or schedule |
| `trigger-scheduled-managed-scan` | `processScheduledManagedScanJob` | Cron scheduler |
| `ai-verify-findings` | `processAiVerifyJob` | After parsing (if AI enabled) |

### Worker Registration

Workers are registered in `src/instrumentation.ts` at server startup (Node.js runtime only):

```typescript
// parse results
await queue.work(QUEUE_JOBS.PARSE_SCAN_RESULT, processParseScanResultJob);

// retention cleanup (also scheduled daily at 03:00)
await queue.work(CLEANUP_OLD_SCAN_FILES_JOB_NAME, processCleanupOldScanFilesJob);
await queue.schedule(CLEANUP_OLD_SCAN_FILES_JOB_NAME, '0 3 * * *');

// managed scan execution
await queue.work(QUEUE_JOBS.RUN_MANAGED_SCAN, processManagedScanJob);

// scheduled scan trigger
await queue.work(QUEUE_JOBS.TRIGGER_SCHEDULED_MANAGED_SCAN, processScheduledManagedScanJob);
```

### Job Chain

```
Upload/Trigger
    │
    ├──→ enqueue('run-managed-scan')  [Managed flow only]
    │         │
    │         ▼
    │    processManagedScanJob()
    │         │
    │         ├──→ enqueue('parse-scan-result')  [per scanner]
    │         │
    │         └──→ enqueue('ai-verify-findings')  [if policy.ai_verification = 'enabled']
    │
    └──→ enqueue('parse-scan-result')  [External flow]
              │
              ├──→ processParseScanResultJob()
              │         │
              │         ├──→ create findings with dedup
              │         │
              │         └──→ enqueue('ai-verify-findings')  [if enabled]
              │
              └──→ processAiVerifyJob()
                        │
                        ├──→ for each finding:
                        │      ├──→ getKnowledgeContext()
                        │      ├──→ LLM.verify()
                        │      ├──→ insertAiVerification()
                        │      └──→ updateFinding()
                        │
                        └──→ updateScanResult({ aiVerifiedCount })
```

### Key Files

- `src/instrumentation.ts`
- `src/server/modules/queue/queue.service.ts`
- `src/server/modules/queue/jobs/parse-scan-result.job.ts`
- `src/server/modules/queue/jobs/cleanup-old-scan-files.job.ts`
- `src/server/modules/queue/jobs/ai-verify-finding.job.ts`
- `src/commons/constants/queue.ts`

---

## 12. Quality Gate Flow

**Trigger**: After scan completion or manual evaluation

### Steps

1. `POST /api/v1/quality-gates/evaluate` with scanId
2. `qualityGateService.evaluate()` loads gate config for workspace
3. Get findings for the scan
4. Count blocking findings (above severity threshold)
5. Count pending findings (open status)
6. Evaluate:
   - If blocking findings > 0 → `failed`
   - If pending findings > 0 and `warn_on_pending` → `warning`
   - Else → `passed`
7. Store result in `quality_gate_results`

### Key Files

- `src/app/api/v1/quality-gates/evaluate/route.ts`
- `src/server/modules/scan/services/quality-gate.service.ts`

### Database Tables

`quality_gates`, `quality_gate_results`, `findings`

---

## 13. Scan Policy Flow

### Create Policy

1. Manager+ sends `POST /api/v1/workspaces/[id]/scan-policies`
2. Validate scanners against `SUPPORTED_SCANNERS`
3. Create policy with defaults (profile: standard, ai_verification: enabled, etc.)

### Attach Policy to Repository

1. Manager selects policy for repository
2. `PUT .../repositories/[repoId]/policy`
3. Validate: workspace ownership, repository is SCM type
4. Update `repositories.current_policy_id`

### Key Files

- `src/app/api/v1/workspaces/[id]/scan-policies/route.ts`
- `src/server/modules/scan/services/scan-policy.service.ts`
- `src/server/modules/scan/schemas/scan-policy.schema.ts`

### Database Tables

`scan_policies`, `repositories`

---

## 14. Knowledge Base Flow

### Purpose

Provides CWE/NVD context to AI verification models for more accurate verdicts.

### Steps

1. Knowledge sources configured in `knowledge_sources` table
2. Entries stored in `knowledge_entries` with CWE IDs, severity, tags
3. During AI verification: `getKnowledgeContext(rule, file_path)` fetches relevant entries
4. Context included in AI prompt for better accuracy

### Key Files

- `src/features/knowledge-base/EntryModals.tsx`
- `drizzle/schema/integrations.ts` — `knowledge_sources`, `knowledge_entries`

### Database Tables

`knowledge_sources`, `knowledge_entries`

---

## 15. Storage Flow

### Architecture

Three storage drivers via Strategy pattern:

| Driver | When to Use | Configuration |
|--------|-------------|---------------|
| Local | Development, small deployments | `STORAGE_LOCAL_PATH` |
| S3/MinIO | Production, scalable | AWS credentials or MinIO endpoint |
| Cloudinary | Cloud-native | Cloudinary API key |

### Flow

1. Service calls `getStorageDriver()` singleton
2. Driver resolved from `STORAGE_PROVIDER` env var
3. Upload: `driver.upload(buffer, key, options)` → returns `{ key, url, size }`
4. Download: `driver.getStream(key)` or `driver.getUrl(key)`
5. Delete: `driver.delete(key)`

### Key Files

- `src/server/modules/storage/storage.service.ts` → `getStorageDriver()`
- `src/server/modules/storage/storage.interface.ts` — `StorageDriver` interface
- `src/server/modules/storage/drivers/local.driver.ts`
- `src/server/modules/storage/drivers/s3.driver.ts`
- `src/server/modules/storage/drivers/cloudinary.driver.ts`

### Storage Layout

```
/storage/
├── artifacts/                    # Scan reports (30-day retention)
│   └── scan-{id}/
│       ├── semgrep.json
│       └── gitleaks.json
├── reports/                      # Generated reports
│   └── report-{id}.pdf
└── uploads/                      # Local driver uploads
```

---

**Last Updated**: June 2026
```

---

## Summary of All Changes

| File | Action | Est. Lines Changed |
|------|--------|-------------------|
| `README.md` | Update (7 sections) | ~50 lines |
| `docs/PROJECT_STANDARDS.md` | Update (2 sections) | ~15 lines |
| `docs/DEPLOYMENT.md` | Update (3 sections) | ~25 lines |
| `docs/queue.md` | Update (4 sections) | ~30 lines |
| `docs/FLOW.md` | **Create new** | ~600 lines |
| `docs/ADJUSTMENT_PLAN.md` | **Create new** (this file) | ~500 lines |

**Total estimated changes**: ~1,220 lines across 6 files

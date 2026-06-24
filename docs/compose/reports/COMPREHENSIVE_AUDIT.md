# Comprehensive Audit Report — SAST Integration Platform

**Date:** 2026-06-24  
**Scope:** Security, Code Quality, Architecture, Testing  
**Project:** Multi-tenant SAST platform (Next.js 16 + TypeScript + PostgreSQL + Drizzle ORM)  
**Overall Grade:** B+ (Strong foundation with critical gaps)

---

## Executive Summary

| Area | Grade | Critical | High | Medium | Low |
|------|-------|----------|------|--------|-----|
| Security | B | 1 | 3 | 6 | 8 |
| Architecture | B+ | 3 | 7 | 8 | 4 |
| Code Quality | A (93.2/100) | 0 | 2 | 1 | 2 |
| Testing | C+ | 0 | 4 | 6 | 3 |
| **Total** | | **4** | **16** | **21** | **17** |

**Top 5 Must-Fix Before Production:**
1. No row-level tenant isolation (RLS) in PostgreSQL — one missed filter = full tenant breach
2. SCM credentials stored as plaintext JSONB in database
3. CI/CD endpoints vulnerable to IDOR (scanId not workspace-scoped)
4. `scans` table missing `workspaceId` column — breaks workspace isolation
5. `POST /auth/refresh` has zero E2E test coverage despite being security-critical

---

## 1. SECURITY AUDIT

### Critical

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| S-C1 | **CI/CD IDOR** — `scanId` fetched by `getById()` with no workspace filter. Any authenticated user can access/complete any scan. | `src/app/api/v1/ci/upload/route.ts:99`, `ci/complete/route.ts:93` | A01 Broken Access Control |

### High

| ID | Finding | Location | OWASP |
|----|---------|----------|-------|
| S-H1 | **SSRF gap in AI verification** — `callOllama()` and `callOpenAiCompatible()` skip `isPrivateOrInternal()` URL validation | `src/server/modules/scan/services/ai-verification.service.ts:718,778` | A10 SSRF |
| S-H2 | **Missing rate limits** on `/auth/forgot-password`, `/auth/verify-email`, `/auth/resend-verification` — enables email flooding | Auth route handlers | A04 Brute Force |
| S-H3 | **Credentials stored as plaintext JSONB** — GitHub/GitLab/Gitea OAuth tokens in `sourceControls.credentials` with no encryption | `drizzle/schema/source-controls.ts:12` | A02 Crypto Failures |

### Medium

| ID | Finding | Location |
|----|---------|----------|
| S-M1 | Email PII embedded in every JWT access token payload | `src/server/modules/auth/services/jwt.service.ts:11` |
| S-M2 | No rate limiting on most API endpoints (only auth flows) | All route handlers except `/auth/*` |
| S-M3 | No CORS configuration — API accessible from any origin | `next.config.ts` |
| S-M4 | Health endpoint returns 200 unconditionally without checking DB | `src/app/api/v1/health/route.ts:3-5` |
| S-M5 | No request body size limits on route handlers | `src/server/http/validate.ts:39-43` |
| S-M6 | IDOR pattern recurring across 4 endpoints (resource fetched by ID without workspace scoping) | CI endpoints + others |

### Positive Security Findings

- No SQL injection — Drizzle parameterized queries throughout
- No XSS via `dangerouslySetInnerHTML`
- Robust CSRF protection on refresh tokens (`x-refresh-request: 1` header)
- JWT + session architecture with rotation and reuse detection
- Zod validation on 95%+ of routes
- Security headers present (HSTS, X-Frame-Options, CSP)
- `.env` correctly gitignored with production guards
- Neutral signup response prevents email enumeration

---

## 2. ARCHITECTURE REVIEW

### Critical

| ID | Finding | Location |
|----|---------|----------|
| A-C1 | **No row-level tenant isolation** — Multi-tenancy relies entirely on app-level `WHERE workspace_id = ?`. No Postgres RLS policies as safety net. One missed filter = full tenant data breach. | `src/server/modules/*/repositories/` |
| A-C2 | **`scans` table has no `workspaceId` column** — Workspace isolation depends on join through `repositories`. If `repositoryId` is null (schema allows it), isolation breaks entirely. | `drizzle/schema/scans.ts:8-26` |
| A-C3 | **Credentials stored as plaintext JSONB** — `apiKeyEncrypted` column name suggests intent but no actual encryption logic exists. | `drizzle/schema/source-controls.ts:12`, `drizzle/schema/integrations.ts:12` |

### High

| ID | Finding | Location |
|----|---------|----------|
| A-H1 | **No rate limiting globally** — Only auth flows are rate-limited | Route handlers |
| A-H2 | **Health endpoint doesn't check DB connectivity** — Container marked healthy when DB is down | `src/app/api/v1/health/route.ts:3-5` |
| A-H3 | **No request size limits** | `src/server/http/validate.ts:39-43` |
| A-H4 | **Scheduled jobs use `console.log`** — If registration fails silently, jobs never run | `src/instrumentation.ts:66-100` |
| A-H5 | **No connection pooling configuration** — Default settings, risk of exhaustion with pg-boss | `src/server/db/client.ts:10` |
| A-H6 | **No graceful shutdown** — No SIGTERM handler for pg-boss or DB connections | `src/instrumentation.ts` |
| A-H7 | **No CORS configuration** | `next.config.ts` |

### Medium

| ID | Finding |
|----|---------|
| A-M1 | Logger is console-based with no structured output |
| A-M2 | No database migration automation in CI/CD |
| A-M3 | Feature flags duplicated across server (`FEATURE_FLAG_*`) and client (`NEXT_PUBLIC_FEATURE_FLAG_*`) |
| A-M4 | Custom logger per domain is fragile — requires editing central file |
| A-M5 | `db:reset` has no production safety guard |
| A-M6 | Proxy-based DB client loses TypeScript type narrowing |
| A-M7 | No metrics, APM, or alerting |
| A-M8 | No automated backup strategy documented |

### Architecture Strengths

- **Clean layered separation:** Route Handler → Service → Repository with strict directionality
- **Security-first design:** JWT rotation, CSRF protection, Zod validation, SSRF protection
- **Infrastructure as Code:** Multi-stage Dockerfile with scanner binaries
- **Consistent API format:** All responses through `ApiResponse` with requestId + timestamp
- **Lazy initialization:** Proxy-based env and DB avoid import-time side effects
- **Storage strategy pattern:** 3 drivers (local, S3, Cloudinary) with interface-based design

### Module Boundary Assessment

| Module | Coupling | Assessment |
|--------|----------|------------|
| auth | Low | Clean isolation |
| workspace | Low | Good multi-tenant boundary |
| scan | **High** | Depends on 7+ modules — consider extracting orchestration |
| findings | Medium | Well-structured AI verification |
| queue | Low | Singleton pg-boss |
| storage | Low | Excellent strategy pattern |
| source-control | Medium | Needs credential encryption |

### Tech Stack Assessment

| Technology | Assessment |
|-----------|------------|
| Next.js 16 (App Router) | Cutting edge, well-suited for this use case |
| Drizzle ORM | Good type-safe queries, schema-as-code |
| pg-boss | Excellent for Postgres-native job queuing |
| Ant Design 6 | Mature UI library for admin dashboards |
| PostgreSQL 16 | Solid for multi-tenant SaaS |
| jose + bcryptjs | Standard JWT/auth libraries |

**Dependency concern:** Two Postgres clients installed (`pg` + `postgres`). Only `postgres` is used by Drizzle. Remove `pg` to reduce attack surface.

---

## 3. CODE QUALITY AUDIT

**Overall Grade:** A (93.2/100)  
**Files audited:** 101 across 21 feature directories  
**Total code smells:** 309 | **SOLID violations:** 2 | **`any` types:** 0 | **TODO/FIXME:** 0

### Complexity Hotspots

| File | Function | Complexity | Issue |
|------|----------|------------|-------|
| `source-control/ConfigureModal.tsx:58` | ConfigureModal | **13** | Branching on mode/provider, nested try/catch |
| `projects/ProjectDetailPage.tsx:30` | ProjectDetailPage | **13** | 22 imports (DIP violation), inline tab JSX |
| `projects/ProjectsTable.tsx:39` | ProjectsTable | **11** | Table + filtering + pagination + actions in one component |
| `scan/ScanTable.tsx` | ScanTable | **11** | Same pattern as ProjectsTable |
| `scan/NewScanModal.tsx:18` | NewScanModal | **11** | Repo change, scanner toggle, confirm in one component |

### God Component

- **`landing/LandingHero.tsx:99`** — `DashboardMock` is **261 lines** (max recommended: 50). Contains entire mock dashboard UI with severity badges, engine rows, AI status panels, and stat cards all inlined.

### Duplication Patterns

| Pattern | Files | Issue |
|---------|-------|-------|
| Add/Edit model modals | `AddModelModal.tsx`, `EditModelModal.tsx` | ~90% identical (211 vs 210 lines) |
| Edit pages | `EditProjectPage.tsx`, `EditTeamPage.tsx` | Identical structure, differ only in entity name |
| New pages | `NewProjectPage.tsx`, `NewTeamPage.tsx` | Identical pattern |
| Knowledge base modals | `EntryModals.tsx:150,190` | Severity `<Select>` options duplicated inline |

### Magic Numbers

295 of 309 smells are magic numbers — mostly CSS dimensions in inline styles:
- `landing/LandingHero.tsx` — 68 magic numbers
- `landing/LandingMetrics.tsx` — 34 magic numbers
- `reports/ReportPreviewModal.tsx` — 21 magic numbers

### Positive Code Quality Findings

- **Zero `any` types** across 101 files
- **Zero TODO/FIXME/HACK comments**
- **No raw `<Spin />`** — all components use shared LoadingState/ErrorState/EmptyState
- **Consistent four-state handling** (Loading, Empty, Error, Success)
- **Good naming conventions** — PascalCase for components, camelCase for hooks
- **Zod schema validation** used consistently
- **Permission gates** properly applied on destructive actions

---

## 4. TESTING AUDIT

### Test Inventory

| Tier | Files | ~Tests | Framework |
|------|-------|--------|-----------|
| Unit | 20 | 350+ | Vitest |
| E2E API | 21 | 250+ | Vitest |
| Playwright UI | 28 | 140 | Playwright |

### Unit Test Coverage

**Covered (14/22 modules):** auth (5 files — best coverage), scan, project, workspace, teams, knowledge-base, profile, quality-gates, webhooks, scanner-engines, source-control, ai-models, repositories, health

**Uncovered (8 modules):**

| Module | Risk |
|--------|------|
| **audit** | High — security-critical, no logging verification |
| **dashboard** | Medium — aggregation logic untested |
| **notifications** | Medium |
| **reports** | Medium — generation logic untested |
| **schedules** | Medium — cron/timing logic untested |
| **queue** | Medium — pg-boss job processing untested |
| **mail** | Low |
| **storage** | Low |

### E2E API Coverage (~45-50%)

**Entirely untested critical domains:**

| Domain | Endpoints | Severity |
|--------|-----------|----------|
| **CI integration** | `/ci/init`, `/ci/upload`, `/ci/complete` | **Critical** — core product feature |
| **Dashboard** | `/dashboard/stats`, `/dashboard/findings`, `/dashboard/scans`, `/dashboard/health` | High |
| **Activity/Audit logs** | `/activity-logs`, `/audit-logs` | High |
| **Notifications** | `/notifications`, `/notifications/unread-count` | Medium |
| **Reports** | `/reports`, `/reports/[id]`, `/reports/[id]/preview`, `/reports/[id]/download` | Medium |

**Security-critical gap:** `POST /auth/refresh` — zero E2E test despite AGENTS.md calling it security-critical.

### Playwright Flakiness Indicators

| Pattern | Count | Severity |
|---------|-------|----------|
| `waitForTimeout(500)` | **56** | Critical — hardcoded sleeps |
| `waitForLoadState('networkidle')` | **164+** | High — unreliable |
| No Playwright fixtures | 0 fixture files | High — full login every test |
| Dead assertion (`isVisible \|\| true`) | 1 | Medium — always passes |

### Unit Test Quality Issues

1. **Structural-only repo tests** — `typeof method === 'function'` assertions (zero behavioral value)
2. **Vague error assertions** — `.rejects.toThrow()` without specifying error type
3. **Per-property verbose tests** — 367-line file testing each field individually
4. **No coverage thresholds** — `@vitest/coverage-v8` installed but unconfigured

### Missing Edge Cases

| Domain | Missing |
|--------|---------|
| Auth | Refresh token rotation E2E, session revocation, concurrent sessions |
| Findings | Bulk operations, AI-verify, status transitions |
| Scans | Upload via CI, scan cancellation, concurrent scans |
| Reports | Generation, preview rendering, download validation |
| Webhooks | Delivery retry, failure handling, payload signature |
| Queue | Job failure/retry, dead letter handling |
| Schedules | Cron validation, timezone handling |

---

## 5. CROSS-CUTTING FINDINGS

These findings span multiple audit areas:

| Finding | Security | Architecture | Quality | Testing |
|---------|----------|--------------|---------|---------|
| No RLS / tenant isolation | Critical | Critical | — | — |
| Plaintext credentials in DB | High | Critical | — | — |
| CI/CD IDOR | Critical | — | — | High (untested) |
| SSRF gap in AI verification | High | — | — | — |
| Missing rate limits | Medium | High | — | — |
| Health endpoint incomplete | Medium | High | — | Low |
| No graceful shutdown | — | Medium | — | — |
| Console-based logging | — | Medium | — | — |
| `waitForTimeout` flakiness | — | — | — | Critical |
| 8 uncovered test modules | — | — | — | High |

---

## 6. PRIORITIZED REMEDIATION PLAN

### P0 — Critical (fix before any deployment)

1. **Add Postgres RLS policies** for all tenant-scoped tables as defense-in-depth
2. **Add `workspaceId` to `scans` table** (NOT NULL, indexed) and update all queries
3. **Fix CI/CD IDOR** — Add `scan.workspaceId === tokenWorkspaceId` assertion in `ci/upload/route.ts:99` and `ci/complete/route.ts:93`
4. **Encrypt SCM credentials** at application layer before storing in DB
5. **Add E2E test for `POST /auth/refresh`** — security-critical endpoint with zero coverage

### P1 — High (fix before production launch)

6. **Add rate limiting** to `/auth/forgot-password`, `/auth/verify-email`, `/auth/resend-verification`
7. **Apply SSRF validation** to `callOllama()` and `callOpenAiCompatible()` in AI verification
8. **Add DB connectivity check** to health endpoint
9. **Configure connection pooling** with explicit `max` connections
10. **Add E2E tests for CI endpoints** (`/ci/init`, `/ci/upload`, `/ci/complete`)
11. **Remove all 56 `waitForTimeout(500)` calls** in Playwright tests
12. **Add unit tests for `audit`, `dashboard`, `reports`, `schedules`, `queue` modules**
13. **Add SIGTERM handler** for graceful pg-boss shutdown
14. **Add CORS configuration** to `next.config.ts`

### P2 — Medium (fix within 2 weeks)

15. **Add structured logging** (pino/winston with JSON output)
16. **Add database migration automation** to deployment pipeline
17. **Add `db:reset` production safety guard** (NODE_ENV check)
18. **Replace `networkidle` waits** with locator-based waits in Playwright
19. **Add request body size limits** to route handlers
20. **Consolidate Add/Edit model modals** into shared pattern
21. **Extract `DashboardMock` sub-components** from LandingHero.tsx
22. **Add Playwright `storageState` fixture** to eliminate per-test login
23. **Add Vitest coverage thresholds**
24. **Add request body size limits** to route handlers
25. **Derive client feature flags** from server flags (single source of truth)

### P3 — Low (fix within 1 month)

26. **Remove unused `pg` dependency** (only `postgres` is used)
27. **Add composite indexes** on `(workspaceId, ...)` for all tenant-scoped tables
28. **Normalize barrel exports** to named exports (findings/index.ts)
29. **Extract landing page CSS** into modules (295 magic numbers)
30. **Convert silent early returns** to proper `test.skip()` in Playwright

---

## 7. DEPLOYMENT READINESS CHECKLIST

| Aspect | Status | Notes |
|--------|--------|-------|
| Dockerfile | ✅ Ready | Multi-stage build, scanner binaries, non-root user |
| Health checks | ⚠️ Partial | App check exists but doesn't verify DB |
| Migrations | ⚠️ Manual | No CI/CD automation |
| Secrets (env) | ✅ Good | Zod-validated, production guards |
| Secrets (DB) | ❌ Critical | Plaintext credentials |
| Logging | ⚠️ Basic | Console-based only |
| Graceful shutdown | ❌ Missing | No SIGTERM handling |
| Rate limiting | ⚠️ Partial | Auth only |
| CORS | ❌ Missing | No configuration |
| Monitoring | ❌ Missing | No metrics/APM/alerting |
| Backups | ❌ Missing | No automated strategy |
| Tenant isolation | ❌ Critical | No RLS, missing workspaceId on scans |

---

*Report generated by comprehensive audit — Security, Architecture, Code Quality, and Testing*

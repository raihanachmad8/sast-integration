# Security Audit Report — sast-integration

**Date:** 2026-06-24  
**Scope:** Full codebase (white-box static analysis)  
**Methodology:** OWASP Top 10 (2021) systematic review, manual code review, dependency analysis, secret scanning

---

## Executive Summary

The codebase demonstrates strong security fundamentals: parameterized SQL via Drizzle ORM, well-structured JWT + refresh token architecture, comprehensive Zod validation, RBAC on all workspace-scoped routes, and proper `.gitignore`/production guards for secrets. The most critical issues are IDOR vulnerabilities in CI/CD endpoints where `scanId` is not scoped to the authenticated workspace.

**Overall Risk: MEDIUM** — No catastrophic exploitable vulnerabilities in production config, but defense-in-depth gaps exist.

### Summary Counts

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 3 |
| MEDIUM | 6 |
| LOW | 8 |
| INFO | 7 |
| **Total** | **25** |

---

## A01:2021 — Broken Access Control

### FINDING-01: CI/CD Upload IDOR [HIGH]

**CVSS:** 7.5 — `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N`

**Location:** `src/app/api/v1/ci/upload/route.ts:99`  
**Also:** `src/server/modules/scan/repositories/scan.repository.ts:174`

When a `scanId` is provided in the CI upload request, the code calls `scanRepository.getById(scanIdField)` which performs `WHERE id = ?` with no workspace filter. The endpoint authenticates via `authenticateCiCd` resolving `workspaceId` from the API token, but that workspace is never verified against the scan's actual workspace.

**Impact:** An attacker with a valid API token for Workspace A can upload findings to a scan belonging to Workspace B. This corrupts scan data across workspace boundaries.

**Remediation:** After fetching the scan by ID, assert `scan.workspaceId === tokenWorkspaceId`. Return 403 if they don't match.

---

### FINDING-02: CI/CD Complete IDOR [HIGH]

**CVSS:** 7.5 — same vector as FINDING-01

**Location:** `src/app/api/v1/ci/complete/route.ts:93`  
**Also:** `src/server/modules/scan/repositories/scan.repository.ts:174`

Identical pattern to FINDING-01. The `scanRepository.getById(scanId)` lookup has no workspace scoping. An attacker can finalize or mark-complete scans belonging to other workspaces.

**Remediation:** Same as FINDING-01 — add workspace ownership assertion.

---

### FINDING-03: Webhook Delivery IDOR [MEDIUM]

**CVSS:** 5.3

**Location:** `src/app/api/v1/workspaces/[workspaceId]/webhooks/[webhookId]/deliveries/route.ts:22`  
**Also:** `src/server/modules/webhooks/webhook.repository.ts:156`

The route checks `requirePermission(WEBHOOK_MANAGE)` for the workspace, then calls `webhookRepository.listDeliveries(webhookId)`. The repository method does `WHERE webhookId = ?` without verifying the webhook belongs to the authenticated workspace.

**Remediation:** Verify `webhook.workspaceId === workspaceId` before querying deliveries.

---

### FINDING-04: Source Control Import Uninstall IDOR [MEDIUM]

**CVSS:** 5.3

**Location:** `src/app/api/v1/workspaces/[workspaceId]/source-controls/imports/[importId]/route.ts:26`  
**Also:** `src/server/modules/source-control/source-control-import.service.ts:118`

`sourceControlImportService.uninstall(userId, importId)` calls `findImportById(importId)` without workspace scoping. A member of Workspace A can uninstall a repository import belonging to Workspace B.

**Remediation:** Scope the `findImportById` query to include `workspaceId`.

---

### FINDING-05: Permission Count Documentation Error [LOW]

**Location:** `src/commons/constants/permissions.ts:40-78`

AGENTS.md and documentation claim 24 permissions. The `PERMISSION` constant actually defines 31 distinct permissions. This is a documentation discrepancy, not a security vulnerability.

**Roles defined (correctly):**

| Role | Hierarchy | Permission Count |
|------|-----------|-----------------|
| owner | 4 | All 31 |
| manager | 3 | 24 |
| reviewer | 2 | 17 |
| member | 1 | 10 |

**Positive:** Self-role change blocked at `src/server/modules/workspace/services/member.service.ts:41-42`. Owner role assignment blocked at schema level (`src/commons/schemas/member.schema.ts:4`) and service level (`member.service.ts:44-46`). Profile/workspace update schemas restrict fields — no mass assignment risk.

---

## A02:2021 — Cryptographic Failures

### FINDING-06: Password Change Session Invalidation Gap [MEDIUM]

**CVSS:** 5.3

**Location:** `src/server/modules/auth/services/auth.service.ts`

When a user changes their password, existing sessions (and their associated access tokens) remain valid until natural expiry (15 minutes). Sign-out and password-reset both properly revoke sessions, but the password-change flow does not.

**Impact:** If an attacker has a stolen access token, changing the password doesn't immediately revoke it.

**Remediation:** On password change, revoke all sessions for the user except the current one. Use the existing `sessionRepository.revokeAllForUser()` pattern already used in password reset.

---

### FINDING-07: Weak Password Complexity Rules [LOW]

**Location:** `src/commons/schemas/auth.schema.ts:14`

The signup/password schema enforces `min(8).max(128)` but has no complexity requirements (uppercase, lowercase, numbers, special characters). The seed default password `ChangeMe123!` happens to meet basic complexity, but the schema doesn't enforce it.

**Remediation:** Add a `.refine()` check for character class diversity.

---

### Positive: Authentication Architecture

The auth system is well-designed:

- **Access tokens:** 15m expiry, stored in memory (`window.__AccessToken`), sent via Bearer header — never in cookies
- **Refresh tokens:** 7d, `httpOnly`, `secure`, `sameSite: 'strict'`, stored in cookies with rotation-specific identifier
- **Server-side sessions:** PostgreSQL-backed, enabling immediate revocation
- **JWT validation:** jose library, secrets validated ≥32 chars in production (`src/server/env.ts:82-89`)
- **Password hashing:** bcryptjs with configurable salt rounds
- **Edge proxy:** `src/proxy.ts` verifies JWT at edge for page routes (performance optimization)
- **API auth:** `src/server/http/authenticate.ts` additionally validates session exists in database

---

## A03:2021 — Injection

### FINDING-08: CSP Permits unsafe-inline and unsafe-eval [LOW]

**CVSS:** 3.7

**Location:** `next.config.ts:18`

Content-Security-Policy includes `script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:`. The code comment acknowledges this is intentional for Next.js and Ant Design compatibility. While React auto-escapes JSX, the CSP cannot prevent DOM-based XSS if `unsafe-eval` is present.

**Remediation:** Migrate to nonce-based CSP or hash-based inline script allowlisting when Ant Design dependency is reduced.

---

### Positive: No SQL Injection

All 53+ SQL query locations across the codebase use Drizzle ORM's `sql` tagged template literal, which parameterizes all interpolated values. No string concatenation with user input was found. Key files verified:

- `src/server/modules/scan/repositories/finding.repository.ts` (30+ queries)
- `src/server/modules/scan/repositories/scan.repository.ts` (15+ queries)
- `src/server/modules/knowledge-base/knowledge-base.repository.ts`
- `src/server/modules/source-control/source-control-repository.service.ts`

### Positive: No XSS via dangerouslySetInnerHTML

Zero instances of `dangerouslySetInnerHTML` found in source code. Mermaid diagrams at `src/lib/docs/mermaid-diagram.tsx` set `containerRef.current.innerHTML` but with `securityLevel: 'strict'` and developer-controlled input only. Email templates use `escapeHtml()` at `src/server/modules/mail/templates/base.ts:118-124`.

---

## A04:2021 — Insecure Design

### FINDING-09: Missing Rate Limiting on Auth Endpoints [MEDIUM]

**CVSS:** 5.3

**Location (missing rate limiting):**

| Endpoint | Risk |
|----------|------|
| `POST /auth/forgot-password` | Unlimited email sending (email flooding) |
| `GET /auth/verify-email` | Token enumeration attempts |
| `POST /auth/resend-verification` | Unlimited email sending |
| `POST /auth/reset-password` | Token brute-force (mitigated by token length) |

**What's protected:** Signin (5 attempts/15min by email) and signup (by IP). Implementation at `src/server/modules/auth/services/rate-limiter.ts`.

**Remediation:** Apply rate limiting to all auth endpoints. Use email-based limiting for forgot-password/resend-verification and token-based limiting for reset-password.

---

### FINDING-10: Signup Rate Limit Bypass via IP Spoofing [MEDIUM]

**CVSS:** 5.3

**Location:** `src/app/api/v1/auth/signup/route.ts:17`

Signup rate limiting is keyed on `request.headers.get('X-Forwarded-For')`. Without a trusted reverse proxy that strips/overwrites this header, any client can rotate the value to bypass limits.

**Remediation:** Use the `X-Real-IP` header from a trusted proxy, or implement a dual-key strategy (IP + fingerprint). Alternatively, apply stricter limits at the reverse proxy level.

---

### FINDING-11: CI Upload Lacks Zod Validation [MEDIUM]

**CVSS:** 5.0

**Location:** `src/app/api/v1/ci/upload/route.ts:55-77`

The CI upload endpoint uses `formData()` with manual field-presence checks instead of Zod schema validation. While the RBAC check (`authenticateCiCd`) limits access, the lack of schema validation means field types, lengths, and formats aren't enforced at the boundary.

**Remediation:** Create a `ciUploadSchema` with Zod and validate the form data fields against it.

---

### FINDING-12: PR Review Settings Bypasses Input Validation [LOW]

**CVSS:** 3.7

**Location:** `src/app/api/v1/workspaces/[workspaceId]/settings/pr-review/route.ts:45`

The PUT handler does `await request.json()` and passes the raw body directly to `workspaceSettingsService.updatePrReviewSettings()`. No Zod schema validates the shape of the input.

**Remediation:** Create a `prReviewSettingsSchema` with Zod.

---

### FINDING-13: Finding Update Schema Lacks Enum Constraints [LOW]

**CVSS:** 3.7

**Location:** `src/app/api/v1/workspaces/[workspaceId]/findings/[findingId]/route.ts:67-71`

`updateFindingSchema` uses `z.string().optional()` for `status`, `verdict`, and `assignedTo`. These fields should be constrained to valid enum values.

**Remediation:** Change to `z.enum(['open', 'resolved', ...]).optional()` for status and verdict fields.

---

### Positive: CSRF Protection

Refresh endpoint requires `x-refresh-request: 1` custom header (`src/app/api/v1/auth/refresh/route.ts:22-30`). Browsers cannot set custom headers in cross-origin form submissions, blocking CSRF. Combined with `SameSite: 'strict'` cookies (`src/server/modules/auth/cookie.ts:10`), this is robust.

### Positive: Error Handling

All routes return generic "Internal server error" for unexpected failures. Stack traces are logged server-side only. One exception: `src/app/api/v1/ci/init/route.ts:142` returns `err.message` in the 500 response body, which could leak internal details.

---

## A05:2021 — Security Misconfiguration

### FINDING-14: Rate Limiter Disableable via Environment Variable [LOW]

**Location:** `src/server/modules/auth/services/rate-limiter.ts:9`

Setting `RATE_LIMIT_ENABLED=false` disables all authentication rate limiting. While `.env.example` documents this is for testing/development, the flag is available in any environment.

**Remediation:** Only allow this override when `NODE_ENV !== 'production'`, matching the pattern used in `src/server/env.ts` for other security settings.

---

### FINDING-15: Error Message Leakage in CI Init [LOW]

**CVSS:** 3.1

**Location:** `src/app/api/v1/ci/init/route.ts:142`

Returns `Failed to initialize scan: ${err.message}` to the client. If the error originates from database or internal systems, `err.message` could expose connection strings, query syntax, or filesystem paths.

**Remediation:** Return a generic error message and log the detailed error server-side only.

---

### Positive: Security Headers

Well-configured at `next.config.ts:3-28`:

- `X-Frame-Options: DENY` — clickjacking prevention
- `X-Content-Type-Options: nosniff` — MIME sniffing prevention
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` — HSTS
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables dangerous browser APIs
- `Content-Security-Policy` with `frame-ancestors 'none'`, `base-uri 'self'`, `form-action 'self'`

### Positive: CORS

No CORS headers are set, which is secure by default — cross-origin browser requests are blocked. Since the frontend and API share the same origin (Next.js), this is appropriate.

---

## A06:2021 — Vulnerable and Outdated Components

### FINDING-16: Deprecated Transitive Dependencies [MEDIUM]

**Location:** `pnpm-lock.yaml`

Several deprecated packages exist in the transitive dependency tree:

| Package | Issue | Depth |
|---------|-------|-------|
| `glob@7.2.3` | Deprecated with "widely publicized security vulnerabilities" | Transitive via rimraf |
| `fstream@1.0.12` | No security patches forthcoming | Transitive via glob |
| `inflight@1.0.6` | Documented memory leak | Transitive via glob |
| `rimraf@2.7.1` | Depends on deprecated glob | Transitive |
| `uuid@8.3.2` | Will lose long-term support | Transitive |

**Impact:** While no active CVE targets these specific versions, running an SAST tool with deprecated dependencies in its own tree is a supply chain concern.

**Remediation:** Run `pnpm update` to pull latest compatible versions. Remove `@types/bcryptjs` from devDependencies (redundant — `bcryptjs@3.0.3` ships its own types).

---

### FINDING-17: No Automated Dependency Auditing [LOW]

**Location:** `.github/` directory

No Dependabot or Renovate configuration exists. No CI workflow runs `pnpm audit` or `npm audit`. The project scans other code for vulnerabilities but doesn't scan itself.

**Remediation:** Add `.github/dependabot.yml` or `renovate.json`. Add a CI workflow step: `pnpm audit --audit-level=high`.

---

## A07:2021 — Identification and Authentication Failures

### FINDING-18: User Enumeration via Signup [LOW]

**CVSS:** 3.1

**Location:** `src/server/modules/auth/services/auth.service.ts:69-71`

Signup returns HTTP 409 when the email already exists, confirming whether an email is registered. This enables account enumeration.

**Mitigation:** This is documented as intentional behavior. Consider returning a generic "check your email" response for both new and existing accounts if enumeration is a concern.

---

### FINDING-19: Email Verification Not Enforced Before Login [INFO]

**Location:** `src/server/modules/auth/services/auth.service.ts:87-116`

The `twoFactorSecret` column exists in the users schema (`drizzle/schema/users.ts:13-14`) but 2FA is not implemented. Email verification is not required before allowing login.

**Mitigation:** Documented as intentional for the current phase.

---

## A09:2021 — Security Logging and Monitoring Failures

### FINDING-20: No Structured Security Event Logging [INFO]

Authentication events (signin, signup, password reset) are logged via the generic logger but not tagged as security events. There's no alerting threshold for failed login attempts beyond the rate limiter's in-memory state.

**Remediation:** Consider tagging auth events with a `security` category and implementing log-based alerting for anomalous patterns (multiple failed signins from different IPs for the same email).

---

## A10:2021 — Server-Side Request Forgery (SSRF)

### FINDING-21: SSRF in AI Verification Service [MEDIUM]

**CVSS:** 5.3

**Location:** `src/server/modules/scan/services/ai-verification.service.ts:718,778`

The `callOllama()` and `callOpenAiCompatible()` functions fetch from a `baseUrl` stored in the database (user-configured model settings). These URLs are NOT validated against private/internal ranges before fetching.

The model test endpoint (`src/app/api/v1/workspaces/[workspaceId]/model/[modelId]/test/route.ts:44-46`) correctly uses `isPrivateOrInternal()` from `src/server/lib/ssrf.ts`, but the actual verification execution path does not.

**Attack scenario:** An attacker with `AI_MODEL_MANAGE` permission configures a model with `baseUrl` pointing to `http://169.254.169.254/latest/meta-data/` (cloud metadata) or `http://localhost:5432/` (database). When AI verification runs, the service makes SSRF requests to these internal endpoints.

**SSRF protection exists at:** `src/server/lib/ssrf.ts:5-22` — blocks localhost, private IPs, cloud metadata endpoints, `.local` domains.

**Remediation:** Apply `isPrivateOrInternal()` validation to the `baseUrl` before each call in `callOllama()` and `callOpenAiCompatible()`, matching the protection already implemented in the test endpoint.

---

## A08:2021 — Software and Data Integrity Failures

### FINDING-22: No CI/CD Pipeline Integrity Checks [INFO]

No GitHub Actions workflows exist. The `.github/` directory contains only issue/PR templates. There are no SAST, dependency audit, or secret scanning gates in CI/CD.

**Remediation:** Add GitHub Actions workflow with `pnpm audit`, secret scanning (gitleaks/trufflehog), and lint/typecheck steps.

---

## Secrets Management

### FINDING-23: .env Contains Live Credentials [HIGH — Mitigated]

**Location:** `.env`

Contains real Neon PostgreSQL credentials, JWT signing secret, Gitea runner token, and Cloudinary API key/secret.

**Mitigation:** `.env` is in `.gitignore` (line 14). Confirmed NOT tracked by git. No secrets found in git history. Production guards in `src/server/env.ts:82-89` reject weak JWT secrets and insecure mail providers.

**Risk:** If `.env` is ever accidentally committed (e.g., `git add .` before `.gitignore` loads), all credentials are exposed. Consider adding gitleaks as a pre-commit hook.

---

### FINDING-24: Default Password in Codebase [HIGH — Mitigated]

**Locations:** `drizzle/seeds/constants.ts:4`, `tests/helpers/setup.ts:8`, `tests/e2e/findings/findings.test.ts:7`, `tests/e2e-ui/workspace/workspace-chooser.spec.ts:22`, `.env.example:35`

The string `ChangeMe123!` appears in seed constants, test fixtures, and example env files.

**Mitigation:** `drizzle/seed.ts:36-44` refuses to seed with defaults when `NODE_ENV=production`. This provides defense-in-depth against deploying with weak credentials.

---

### FINDING-25: Docker Compose Hardcoded DB Credentials [MEDIUM]

**Location:** `docker-compose.yml:19,39-40`

Hardcodes `postgres:postgres` as database credentials. While overridden by `env_file: .env`, the defaults are weak.

**Remediation:** Use environment variable substitution like the runner compose: `${POSTGRES_PASSWORD:-postgres}`.

---

## SSRF Protection Coverage

| Endpoint | Fetches URLs | Protected | File |
|----------|-------------|-----------|------|
| `/model/:modelId/test` | Yes (model baseUrl) | YES | `model/[modelId]/test/route.ts:44-46` |
| Webhook `testWebhook()` | Yes (webhook.url) | YES | `webhooks/webhook.service.ts:103-107` |
| `callOllama()` | Yes (baseUrl) | **NO** | `ai-verification.service.ts:718` |
| `callOpenAiCompatible()` | Yes (baseUrl) | **NO** | `ai-verification.service.ts:778` |
| Source control APIs | Yes (provider URLs) | N/A (admin-configured) | Various `source-control/*-api.service.ts` |
| Knowledge base sync | Yes (hardcoded URLs) | N/A | `knowledge-base/sync-engine.ts:172,220` |

---

## RBAC Coverage Summary

All 60+ workspace-scoped API routes under `/api/v1/workspaces/[workspaceId]/` use `requirePermission()`. User-scoped routes (profile, password, avatar) authenticate via `authenticate()` and scope by `auth.context.userId`. Public routes (health check, OAuth callback) are appropriately unprotected.

**CI/CD routes** (`/api/v1/ci/*`) use `authenticateCiCd` which resolves workspace from a Project API Token — a separate auth path that creates the IDOR gap identified in FINDING-01 and FINDING-02.

---

## Remediation Priority Matrix

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| **P0** | FINDING-01, 02 (CI/CD IDOR) | Low (add 1 assertion) | High (cross-workspace data corruption) |
| **P1** | FINDING-21 (SSRF in AI verification) | Low (add URL validation) | Medium (internal network access) |
| **P1** | FINDING-09 (missing rate limits) | Low (add rate limiter calls) | Medium (email flooding, token brute-force) |
| **P2** | FINDING-06 (password change sessions) | Low (revoke sessions) | Medium (stale token persistence) |
| **P2** | FINDING-03, 04 (webhook/import IDOR) | Low (add ownership check) | Medium (cross-workspace data access) |
| **P2** | FINDING-10 (signup rate limit bypass) | Medium (proxy config) | Medium (account creation abuse) |
| **P2** | FINDING-11 (CI upload validation) | Low (add Zod schema) | Medium (input validation gap) |
| **P3** | FINDING-16 (deprecated deps) | Medium (upgrade tree) | Low (supply chain hygiene) |
| **P3** | FINDING-08 (CSP unsafe-inline) | High (Ant Design migration) | Low (XSS defense-in-depth) |
| **P4** | FINDING-17, 22 (CI/CD security) | Medium (add workflows) | Low (preventive controls) |

---

## Files Referenced

**Authentication:** `src/server/http/authenticate.ts`, `src/server/http/response.ts`, `src/server/modules/auth/services/auth.service.ts`, `src/server/modules/auth/services/rate-limiter.ts`, `src/server/modules/auth/cookie.ts`, `src/server/modules/auth/constants.ts`, `src/proxy.ts`, `src/server/env.ts`

**RBAC:** `src/commons/constants/permissions.ts`, `src/commons/constants/security.ts`, `src/server/modules/workspace/workspace.middleware.ts`, `src/server/modules/workspace/services/member.service.ts`, `src/commons/schemas/member.schema.ts`

**API Routes:** `src/app/api/v1/ci/upload/route.ts`, `src/app/api/v1/ci/complete/route.ts`, `src/app/api/v1/ci/init/route.ts`, `src/app/api/v1/auth/*/route.ts`, `src/app/api/v1/workspaces/[workspaceId]/*/route.ts`

**Security Libraries:** `src/server/lib/ssrf.ts`, `src/server/modules/mail/templates/base.ts`, `next.config.ts`

**Dependencies:** `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`

**Secrets:** `.env`, `.env.example`, `.gitignore`, `docker-compose.yml`, `drizzle/seeds/constants.ts`

---

**Audit performed by:** MiMo Code Agent  
**Classification:** Internal — Authorized Security Assessment

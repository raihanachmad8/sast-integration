# Audit Test Coverage — SAST Integration (Final)

> **Date**: 2026-06-12
> **Total test files**: 68
> **Total test cases**: ~748

---

## 📊 Master Table — Coverage by Module

| Module | Unit | E2E API | E2E UI | Total |
|--------|:----:|:-------:|:------:|:-----:|
| **Auth** | ✅ 32 | ✅ 33 | ✅ 30 | **95** |
| **Workspace** | ✅ 38 | ✅ 37 | ✅ 13 | **88** |
| **Teams** | ✅ 33 | ✅ 16 | ✅ 21 | **70** |
| **Project** | ✅ 37 | ✅ 17 | ✅ 13 | **67** |
| **Scan / Findings** | ✅ 52 | ✅ 15 | ✅ 9 | **76** |
| **Quality Gates** | ✅ 30 | ✅ 6 | ✅ 3 | **39** |
| **Storage** | ✅ 57 | — | — | **57** |
| **Source Control** | ✅ 6 | ✅ 11 | ✅ 8 | **25** |
| **Repositories** | ✅ 38 | ✅ 4 | ✅ 1 | **43** |
| **Profile** | ✅ 21 | ✅ 6 | ✅ 3 | **30** |
| **Scanner Engines** | ✅ 30 | ✅ 3 | ✅ 1 | **34** |
| **Knowledge Base** | ✅ 30 | ✅ 3 | ✅ 1 | **34** |
| **AI Models** | ✅ 30 | ✅ 4 | ✅ 1 | **35** |
| **Webhooks** | ✅ 30 | ✅ 4 | ✅ 1 | **35** |
| **Health** | ✅ 5 | ✅ 5 | — | **10** |
| **Schedules** | ❌ 0 | ✅ 10 | — | **10** |
| **Reports** | ❌ 0 | ❌ 0 | ❌ 0 | **0** |
| **Integrations** | ❌ 0 | ❌ 0 | ❌ 0 | **0** |
| **Mail** | ❌ 0 | — | — | **0** |
| **Arena** | ❌ 0 | ❌ 0 | ❌ 0 | **0** |
| **Audit** | ❌ 0 | ❌ 0 | ❌ 0 | **0** |
| **Notifications** | ❌ 0 | ❌ 0 | ❌ 0 | **0** |

> **Grand Total**: **~748** test cases across **68** test files (62 files verified + 6 barrel/index test files)
> **Coverage Split**: Unit ~494 (66%) | E2E API ~149 (20%) | E2E UI ~105 (14%)
> **Scenario Split**: ✅ Positive ~498 (67%) | ❌ Negative/Edge ~250 (33%)

---

## 📋 Detail Per Module — Test Files & Scenarios

### 🔐 Auth — 95 tests (5 unit + 4 e2e-api + 4 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `auth.service.test.ts` | Unit | 7 | 5 | 12 |
| `auth-flows.service.test.ts` | Unit | 3 | 8 | 11 |
| `auth-cookie.test.ts` | Unit | 1 | 0 | 1 |
| `rate-limiter.test.ts` | Unit | 4 | 1 | 5 |
| `session-expiry.test.ts` | Unit | 1 | 2 | 3 |
| `signin.test.ts` | E2E API | 2 | 6 | 8 |
| `signout.test.ts` | E2E API | 2 | 3 | 5 |
| `signup.test.ts` | E2E API | 2 | 3 | 5 |
| `auth-flows.test.ts` | E2E API | 2 | 13 | 15 |
| `signin.spec.ts` | E2E UI | 10 | 3 | 13 |
| `signup.spec.ts` | E2E UI | 3 | 4 | 7 |
| `password-reset.spec.ts` | E2E UI | 3 | 2 | 5 |
| `protection.spec.ts` | E2E UI | 3 | 2 | 5 |

**Covers**: Sign in/out/up, refresh token rotation & reuse detection, forgot/reset password, email verification, invite flow, rate limiting, session expiry, cookie config, route protection (unauthenticated redirect, already-authenticated guard), branding (desktop/mobile), validation errors (all fields), enumeration protection.

---

### 🏢 Workspace — 88 tests (2 unit + 3 e2e-api + 2 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `workspace.service.test.ts` | Unit | 12 | 14 | 26 |
| `member.service.test.ts` | Unit | 3 | 9 | 12 |
| `workspace.test.ts` | E2E API | 2 | 7 | 9 |
| `workspace-settings.test.ts` | E2E API | 3 | 4 | 7 |
| `member-management.test.ts` | E2E API | 4 | 17 | 21 |
| `workspace-chooser.spec.ts` | E2E UI | 6 | 1 | 7 |
| `workspace-members.spec.ts` | E2E UI | 5 | 1 | 6 |

**Covers**: CRUD workspace, member role management, invitations, switch workspace, SINGLE/MULTIPLE mode behavior, org vs personal workspace, UI workspace chooser, members table with tabs, permission-based UI (no Remove for owner).

---

### 👥 Teams — 70 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `team.service.test.ts` | Unit | 16 | 17 | 33 |
| `teams.test.ts` | E2E API | 5 | 11 | 16 |
| `teams.spec.ts` | E2E UI | 20 | 1 | 21 |

**Covers**: CRUD team, member management, slug generation, permissions (NOT_MEMBER, FORBIDDEN, NOT_FOUND), E2E table/columns/search/empty state, modal form (create/edit), detail drawer with stats.

---

### 📁 Project — 67 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `project.service.test.ts` | Unit | 21 | 16 | 37 |
| `project.test.ts` | E2E API | 8 | 9 | 17 |
| `projects.spec.ts` | E2E UI | 12 | 1 | 13 |

**Covers**: CRUD project, members/teams assignment, API tokens, slug generation, repositories, granular permission checks, E2E table/form/modal/detail navigation.

---

### 🔍 Scan / Findings — 76 tests (4 unit + 2 e2e-api + 2 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `scan.service.test.ts` | Unit | 4 | 2 | 6 |
| `finding.service.test.ts` | Unit | 27 | 3 | 30 |
| `finding.repository.test.ts` | Unit | 6 | 0 | 6 |
| `quality-gate.service.test.ts` | Unit | 9 | 1 | 10 |
| `scans.test.ts` | E2E API | 3 | 3 | 6 |
| `findings.test.ts` | E2E API | 5 | 4 | 9 |
| `scan.spec.ts` | E2E UI | 3 | 1 | 4 |
| `findings.spec.ts` | E2E UI | 4 | 1 | 5 |

**Covers**: Scan CRUD, finding list/filter by scan/project/workspace, AI verification, status updates, assignment, quality gate evaluation (pass/fail/warning/PR), pagination, severity/status/scanner/scanId filters.

---

### 🏆 Quality Gates — 39 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `quality-gates.service.test.ts` | Unit | 24 | 6 | 30 |
| `quality-gates.test.ts` | E2E API | 2 | 4 | 6 |
| `quality-gates.spec.ts` | E2E UI | 3 | 0 | 3 |

**Covers**: Config get/update, role-based access (Owner/Manager/FORBIDDEN), scan evaluation pass/fail/warning, PR evaluation, E2E form rendering.

---

### 💾 Storage — 57 tests (4 unit)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `storage.service.test.ts` | Unit | 9 | 0 | 9 |
| `s3.driver.test.ts` | Unit | 16 | 3 | 19 |
| `local.driver.test.ts` | Unit | 15 | 1 | 16 |
| `cloudinary.driver.test.ts` | Unit | 9 | 4 | 13 |

**Covers**: Factory pattern (local/S3/Cloudinary), driver selection with fallback, S3 (AWS/MiniO), local (file system), Cloudinary (upload/delete/error).

---

### 🔌 Source Control — 25 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `source-control-repository.service.test.ts` | Unit | 6 | 0 | 6 |
| `source-control.test.ts` | E2E API | 8 | 3 | 11 |
| `source-control.spec.ts` | E2E UI | 7 | 1 | 8 |

**Covers**: Backfill, upsert (insert/update/stale), credentials sanitized in API resposne, security (no tokens in DOM), provider cards/sync/configure/test/disconnect.

---

### 📦 Repositories — 43 tests (2 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `repositories.service.test.ts` | Unit | 24 | 6 | 30 |
| `repositories.repository.test.ts` | Unit | 8 | 0 | 8 |
| `repositories.test.ts` | E2E API | 1 | 3 | 4 |
| `repositories.spec.ts` | E2E UI | 1 | 0 | 1 |

**Covers**: CRUD, FORBIDDEN/NOT_FOUND checks, method existence, E2E list/401/404.

---

### 👤 Profile — 30 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `profile.service.test.ts` | Unit | 14 | 7 | 21 |
| `profile.test.ts` | E2E API | 3 | 3 | 6 |
| `profile.spec.ts` | E2E UI | 3 | 0 | 3 |

**Covers**: Get/update profile, avatar upload/remove, sessions list/revoke, change password, NOT_FOUND checks, E2E form visibility.

---

### 🔧 Scanner Engines — 34 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `scanner-engines.service.test.ts` | Unit | 27 | 3 | 30 |
| `scanner-engines.test.ts` | E2E API | 2 | 1 | 3 |
| `scanner-engines.spec.ts` | E2E UI | 1 | 0 | 1 |

**Covers**: List/getById, all fields present, empty array, NOT_FOUND, E2E auth guard.

---

### 📚 Knowledge Base — 34 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `knowledge-base.service.test.ts` | Unit | 23 | 7 | 30 |
| `knowledge-base.test.ts` | E2E API | 1 | 2 | 3 |
| `knowledge-base.spec.ts` | E2E UI | 1 | 0 | 1 |

**Covers**: CRUD entries, pagination/filters, source count update, mute, IDOR protection, FORBIDDEN/NOT_FOUND, E2E auth guard.

---

### 🤖 AI Models — 35 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `ai-models.service.test.ts` | Unit | 26 | 4 | 30 |
| `ai-models.test.ts` | E2E API | 1 | 3 | 4 |
| `ai-models.spec.ts` | E2E UI | 1 | 0 | 1 |

**Covers**: CRUD models, optional fields, workspace filter, test model, fallback chain, FORBIDDEN/NOT_FOUND.

---

### 🔗 Webhooks — 35 tests (1 unit + 1 e2e-api + 1 e2e-ui)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `webhook.service.test.ts` | Unit | 25 | 5 | 30 |
| `webhooks.test.ts` | E2E API | 2 | 2 | 4 |
| `webhooks.spec.ts` | E2E UI | 1 | 0 | 1 |

**Covers**: CRUD webhooks, default active=true, soft delete, FORBIDDEN/NOT_FOUND, E2E auth guard.

---

### ❤️ Health — 10 tests (1 unit + 1 e2e-api)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `health.test.ts` | Unit | 5 | 0 | 5 |
| `health.test.ts` | E2E API | 5 | 0 | 5 |

**Covers**: Healthy status, ISO timestamp, response structure, no auth required, response time.

---

### ⏰ Schedules — 10 tests (1 e2e-api)

| File | Type | ✅ Pos | ❌ Neg | Total |
|------|:----:|:------:|:------:|:-----:|
| `schedules.test.ts` | E2E API | 3 | 7 | 10 |

**Covers**: List schedules, pagination, create schedule, get detail, toggle enabled/disabled, 401/404/422 error cases.

---

## 📉 Modules Without Coverage

| Module | Missing | Notes |
|--------|---------|-------|
| **Reports** | ❌ 0 tests | DB schema exists, server module & client module exist but no route handler tests |
| **Integrations** | ❌ 0 tests | DB schema exists, no server module |
| **Mail** | ❌ 0 tests | Only mocked in auth tests — no dedicated mail service tests |
| **Arena** | ❌ 0 tests | "Coming Soon" page |
| **Audit** | ❌ 0 tests | Client module exists but no API route handler |
| **Notifications** | ❌ 0 tests | Client module exists but no API route handler |

---

## 📁 Test File Index (68 files)

```
tests/
├── unit/modules/                          (29 files, ~494 tests)
│   ├── auth/                              (5 files, 32 tests)
│   │   ├── auth.service.test.ts           (12)
│   │   ├── auth-flows.service.test.ts     (11)
│   │   ├── auth-cookie.test.ts            (1)
│   │   ├── rate-limiter.test.ts           (5)
│   │   └── session-expiry.test.ts         (3)
│   ├── workspace/                         (2 files, 38 tests)
│   │   ├── workspace.service.test.ts      (26)
│   │   └── member.service.test.ts         (12)
│   ├── teams/                             (1 file, 33 tests)
│   │   └── team.service.test.ts           (33)
│   ├── project/                           (1 file, 37 tests)
│   │   └── project.service.test.ts        (37)
│   ├── scan/                              (4 files, 52 tests)
│   │   ├── scan.service.test.ts           (6)
│   │   ├── finding.service.test.ts        (30)
│   │   ├── finding.repository.test.ts     (6)
│   │   └── quality-gate.service.test.ts   (10)
│   ├── storage/                           (4 files, 57 tests)
│   │   ├── storage.service.test.ts        (9)
│   │   ├── s3.driver.test.ts              (19)
│   │   ├── local.driver.test.ts           (16)
│   │   └── cloudinary.driver.test.ts      (13)
│   ├── source-control/                    (1 file, 6 tests)
│   │   └── source-control-repository.service.test.ts (6)
│   ├── repositories/                      (2 files, 38 tests)
│   │   ├── repositories.service.test.ts   (30)
│   │   └── repositories.repository.test.ts (8)
│   ├── profile/                           (1 file, 21 tests)
│   │   └── profile.service.test.ts        (21)
│   ├── scanner-engines/                   (1 file, 30 tests)
│   │   └── scanner-engines.service.test.ts (30)
│   ├── quality-gates/                     (1 file, 30 tests)
│   │   └── quality-gates.service.test.ts  (30)
│   ├── knowledge-base/                    (1 file, 30 tests)
│   │   └── knowledge-base.service.test.ts (30)
│   ├── ai-models/                         (1 file, 30 tests)
│   │   └── ai-models.service.test.ts      (30)
│   ├── webhooks/                          (1 file, 30 tests)
│   │   └── webhook.service.test.ts        (30)
│   └── health/                            (1 file, 5 tests)
│       └── health.test.ts                 (5)
│
├── e2e/                                   (21 files, ~149 tests)
│   ├── auth/
│   │   ├── signin.test.ts                 (8)
│   │   ├── signout.test.ts                (5)
│   │   ├── signup.test.ts                 (5)
│   │   └── auth-flows.test.ts            (15)
│   ├── workspace/
│   │   ├── workspace.test.ts             (9)
│   │   ├── workspace-settings.test.ts     (7)
│   │   └── member-management.test.ts     (21)
│   ├── teams/                             (16)
│   ├── project/                           (17)
│   ├── profile/                           (6)
│   ├── scanner-engines/                   (3)
│   ├── quality-gates/                     (6)
│   ├── knowledge-base/                    (3)
│   ├── ai-models/                         (4)
│   ├── webhooks/                          (4)
│   ├── source-control/                    (11)
│   ├── scans/                             (6)
│   ├── findings/                          (9)
│   ├── repositories/                      (4)
│   ├── schedules/                         (10)
│   └── health/                            (5)
│
└── e2e-ui/                                (18 files, ~105 tests)
    ├── auth/
    │   ├── signin.spec.ts                (13)
    │   ├── signup.spec.ts                 (7)
    │   ├── password-reset.spec.ts         (5)
    │   └── protection.spec.ts             (5)
    ├── workspace/
    │   ├── workspace-chooser.spec.ts      (7)
    │   └── workspace-members.spec.ts      (6)
    ├── projects/                          (13)
    ├── teams/                             (21)
    ├── source-control/                    (8)
    ├── repositories/                      (1)
    ├── scan/                              (4)
    ├── findings/                          (5)
    ├── quality-gates/                     (3)
    ├── profile/                           (3)
    ├── ai-models/                         (1)
    ├── knowledge-base/                    (1)
    ├── scanner-engines/                   (1)
    └── webhooks/                          (1)
```

---

## 📈 Test Quality Summary

| Level | Description | Modules | Count |
|-------|-------------|---------|:-----:|
| 🟢 **Excellent** | Unit + E2E API + E2E UI, >80 tests | Auth, Workspace | 2 |
| 🟢 **Strong** | Unit + E2E API + E2E UI, 50-80 tests, ± scenarios | Teams, Project, Scan/Finding | 3 |
| 🟡 **Adequate** | All layers covered, 25-45 tests | Storage, Source Control, Repositories, Profile, Quality Gates, Knowledge Base, AI Models, Webhooks | 9 |
| 🟡 **Thin** | Minimal E2E UI (1 smoke), unit heavy | Scanner Engines, Schedules, Health | 3 |
| ⚫ **None** | 0 tests | Reports, Integrations, Mail, Arena, Audit, Notifications | 6 |

### Scenario Balance

| Module | ✅ Positive | ❌ Negative | Neg Ratio |
|--------|:----------:|:----------:|:---------:|
| Auth | 40 | 55 | **58%** |
| Workspace | 35 | 53 | **60%** |
| Teams | 41 | 29 | 41% |
| Project | 41 | 26 | 39% |
| Scan/Finding | 58 | 15 | 21% |
| Storage | 49 | 8 | 14% |
| Knowledge Base | 25 | 9 | 26% |
| **Total** | **498** | **250** | **33%** |

> **Insight**: Auth & Workspace have the highest negative ratio (58-60%) — appropriate for security/auth flows. Scan/Finding & Storage have lower negative ratios (14-21%) — could benefit from more edge case coverage.

---

## 🔴 Key Gaps vs Modules

| Gap | Impact |
|-----|--------|
| **Audit, Notifications**: 0 tests + no API route handlers | Feature non-functional |
| **Reports**: 0 tests | No server module implemented |
| **Mail**: 0 tests (only mocked) | Email bugs surface in production |
| **Scan E2E UI**: 4 smoke tests only, no run/filter/detail | UI regression risk |
| **Findings E2E UI**: 5 partial tests, no triage/assign/verify flow | UI regression risk |
| **Scanner Engines E2E UI**: 1 smoke test | Basic page-render only |

---

## 🎯 Priority Recommendations

| Priority | Action | Benefit |
|----------|--------|---------|
| 🚨 P0 | Add route handlers for **Audit**, **Notifications** | Fix broken features |
| 🚨 P0 | Expand **Scan + Findings E2E UI** to 10+ tests each | Cover critical triage flow |
| 🔴 P1 | Add **Reports** server module + tests | Enable report feature |
| 🔴 P1 | Add **Mail** unit tests (console + SMTP) | Prevent email regressions |
| 🟡 P2 | Add **Scanner Engines** E2E UI tests (detail, rules) | Cover probe/apply actions |
| 🟡 P2 | Increase negative scenario ratio for Scan/Finding/Storage | Edge case coverage |
| 🟢 P3 | Add **Schedules** unit tests (currently E2E only) | Unit-level coverage |

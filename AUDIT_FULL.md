# Audit Full Coverage — SAST Integration

> **Date**: 2026-06-12
> **Scope**: All pages, feature components, shared components, API routes, client modules, test coverage, mock/placeholder content

---

## 📊 Executive Summary

| Area | Files Audited | Findings |
|---|---|---|
| Pages | 36 | ✅ 32 pages analyzed, ~8 with significant gaps |
| Feature Components | 80+ | ✅ 90+ components analyzed, ~15 with issues |
| Shared Components | 38 | ✅ All analyzed, ~5 minor issues |
| API Route Handlers | ~75 route.ts files | ✅ ~14 files with pattern violations (19%) |
| Client Modules | 21 modules | ✅ 5 with significant bugs, 3 broken (non-functional) |
| Test Coverage | 57 test files | ✅ 14/18 modules covered, 4 with 0 coverage |

---

## 1. 🚨 CRITICAL — Harus Segera Diperbaiki

### 1.1 Client Module: API Endpoints Tidak Ada (3 modules BROKEN)

Modules ini punya client-side API calls tetapi route handler-nya **tidak ada** di `src/app/api/v1/`. Semua request akan return 404 (catch-all).

| Module | Endpoint | Dampak |
|--------|----------|--------|
| **audit** | `/api/v1/audit-logs`, `/api/v1/activity-logs` | Audit log pages **100% broken** |
| **notifications** | `/api/v1/notifications`, `/api/v1/notifications/unread-count` | Notifications **100% broken** |
| **schedules** | `/api/v1/workspaces/{workspaceId}/schedules/*` | Schedule pages **100% broken** |

**File**: `src/modules/audit/api.ts`, `src/modules/notifications/api.ts`, `src/modules/schedules/api.ts`

**Fix**: Implement route handlers atau hapus module jika tidak diperlukan.

### 1.2 Profile Module: Hardcoded API Paths Missing `/api/v1` Prefix

**File**: `src/modules/profile/api.ts` (lines 18, 23, 28)

```typescript
// SALAH — missing /api/v1 prefix:
_api.Get('/auth/sessions')
_api.Delete(`/auth/sessions/${sessionId}`)
_api.Get('/auth/audit-log')

// BENAR:
_api.Get(ENDPOINTS.AUTH.SESSIONS)        // = /api/v1/auth/sessions
_api.Delete(ENDPOINTS.AUTH.REVOKE_SESSION(sessionId))
_api.Get(ENDPOINTS.AUTH.AUDIT_LOG)
```

**Dampak**: Session listing, session revocation, audit log **semua broken di runtime**.

### 1.3 Scan Module: Polling `refetchInterval` Tidak Pernah Dipakai (BUG)

**File**: `src/modules/scan/queries.ts`

`refetchInterval` dihitung **setelah** `useQuery` dan di-spread ke return object, tapi TIDAK pernah dioper ke `useQuery` options. TanStack Query polls dari options, bukan dari return value.

**Dampak**: Auto-refresh scan list/detail untuk active scans **tidak bekerja**.

### 1.4 Quality-Gates Module: Cache Collision Query Keys (BUG)

**File**: `src/modules/quality-gates/queries.ts`

3 hooks (`useQualityGatesQuery`, `useQualityGateConfigQuery`, `useQualityGateResultsQuery`) semua pakai `qualityGateKeys.all` = `['quality-gates']`, tapi manggil API berbeda (`list()` vs `getConfig()` vs `listResults()`) yang return data shape berbeda.

**Dampak**: Cache saling timpa. Data corrupt di runtime.

### 1.5 API Route: `window.__accessToken` Pattern (XSS Vulnerability)

**Files**:
- `src/app/(authenticated)/[workspace]/webhooks/page.tsx` (line 174)
- `src/app/(authenticated)/[workspace]/reports/page.tsx` (line 129)

Akses token dibocorkan ke `window.__accessToken` via props dari layout, diakses langsung oleh `fetch()` calls. Ini **XSS vulnerability** — script injection bisa mencuri token.

### 1.6 API Route: Report Download 510 Line Inline Logic

**File**: `src/app/api/v1/workspaces/[workspaceId]/reports/[reportId]/download/route.ts`

Seluruh PDF/XLSX/CSV report generation engine (510 lines) inline di route handler — pattern violation terbesar. Import repository langsung, bypass service layer, helper functions didefinisikan inline.

### 1.7 Feature Component: `VerificationSettingsCard.tsx` — No-op Save

**File**: `src/features/model/VerificationSettingsCard.tsx` (line 37)

Tombol Save **tidak melakukan apa-apa**. `handleSave` cuma show `message.success` tanpa API call. Semua setting cuma local state.

---

## 2. 🔴 HIGH — Prioritas Tinggi

### 2.1 API Routes: 5 Route Handlers Bypass Service Layer

| File | Issue |
|------|-------|
| `auth/me/route.ts` | Panggil `authRepository` langsung, bypass `authService` |
| `auth/invite/route.ts` GET | Inline business logic untuk invitation validation |
| `auth/reset-password/route.ts` GET | Inline DB query langsung |
| `repositories/[repoId]/route.ts` PATCH | Inline DB operations (select + update) — bypass service & repository layers |
| `webhooks/[webhookId]/deliveries/route.ts` | Panggil `webhookRepository` langsung |

### 2.2 Feature Components: 6 Drawer Return `null` Alih-alih `EmptyState`

Melanggar aturan CLAUDE.md: "Never return `null` — use `LoadingState`/`EmptyState`/`ErrorState`"

| File | Line |
|------|------|
| `FindingDetailDrawer.tsx` | 43 |
| `ProjectDetailDrawer.tsx` | 26 |
| `TeamDetailDrawer.tsx` | 26 |
| `ScanDetailDrawer.tsx` | 54 |
| `RepositoryDetailDrawer.tsx` | 27 |
| `ReportPreviewDrawer.tsx` | 34 |

### 2.3 Scan Page: All Errors Silent

**File**: `src/app/(authenticated)/[workspace]/scan/page.tsx`

Scan list, scan detail, dan scan findings query errors semuanya **silent**. Tidak ada error handling — page render dengan data kosong tanpa feedback ke user.

### 2.4 Finding Detail: Fragile Type Assertion & Comments Client-Only

**File**: `src/app/(authenticated)/[workspace]/findings/[id]/page.tsx`

- Line 39-47: `as unknown as {...}` casting — akan silent break jika API response structure berubah
- Comments **hanya client-side**, tidak pernah dipersist ke server — placeholder/TODO

### 2.5 Client Module: `workspace-settings` Bypasses Axios Interceptor

**File**: `src/modules/workspace-settings/queries.ts`

Gunakan `apiFetch` dari `@/lib/api/fetch` langsung, bukan `_api` axios client. Tidak ada `api.ts`, `keys.ts`, `types.ts`. **Auto-refresh interceptor tidak aktif** — bisa 401 saat token expired.

### 2.6 API Route: `model/[modelId]/test/route.ts` — Inline SSRF Check

**File**: `src/app/api/v1/workspaces/[workspaceId]/model/[modelId]/test/route.ts`

SSRF check, HTTP fetch dengan timeout, dan DB updates semuanya inline. Harus delegate ke service.

### 2.7 Forgot Password Page: Inconsistent Pattern

**File**: `src/app/(unauthenticated)/auth/forgot-password/page.tsx`

- Tidak pakai module hook (langsung `fetch()`)
- Tidak pakai Zod schema (inline Ant Design validation rules)
- Tidak konsisten dengan signin/signup yang pakai `createZodSync`

---

## 3. 🟡 MEDIUM — Perlu Diperbaiki

### 3.1 Pages: Missing Error/Empty States

| Page | Missing |
|------|---------|
| Dashboard | Findings & health query errors silent |
| Members | Invitations query error silent |
| Profile | Hardcoded email fallback `'admin@sast.local'` |
| Source Control | Repos query error silent |
| Repositories | No loading/error at page level |

### 3.2 Feature Components: 4 Inline Error Displays Instead of `ErrorState`

| File | Lines |
|------|-------|
| `FindingsTable.tsx` | 199-205 |
| `ScanTable.tsx` | 199-205 |
| `ProjectApiTokens.tsx` | 143-144 |
| `InvitationsTable.tsx` | (no error state) |

### 3.3 3 Tables Missing ErrorState

- `RepositoriesTable.tsx`
- `MembersTable.tsx`
- `InvitationsTable.tsx`

### 3.4 Duplicate Type Definitions

- `ProjectFormInput`: defined in both `src/features/projects/types.ts` AND `src/modules/projects/types`
- `TeamFormInput`: defined in both `src/features/teams/types.ts` AND `src/modules/teams/types`
- Local types in `ScannerModals.tsx`, `EntryModals.tsx`, `ScheduleModals.tsx` instead of commons

### 3.5 DataTable: Dead Sort State

**File**: `src/components/shared/DataTable.tsx` (line 145)

`sort` state declared via `useState` tapi **tidak pernah di-update** (no `setSort` call). SortIndicator selalu show unsorted icon.

### 3.6 FilterControl: Dead `date` / `dateRange` Types

**File**: `src/components/shared/FilterControl.tsx`

`date` dan `dateRange` dideklarasikan di `FilterItem.type` tapi **tidak pernah diimplementasikan**.

### 3.7 Feature Component: `FindingActions.tsx` — `any` Type

**File**: `src/features/findings/FindingActions.tsx` (line 29)

```typescript
models.map((m: any) => ...) // bypasses TypeScript safety
```

### 3.8 API Routes: Non-standard Validation Patterns

| File | Issue |
|------|-------|
| `members/[userId]/route.ts` PATCH | `request.json()` + `safeParse` instead of `validateBody` |
| `reports/route.ts` POST | Same |
| `ci/commit-status/route.ts` POST | Same |
| `ci/pr-comment/route.ts` POST | Same |

### 3.9 Duplicated Helper: `resolveReturnTo`

**Files**: `source-controls/route.ts` dan `source-controls/[providerId]/route.ts` — fungsi identik didefinisikan 2x.

### 3.10 Profile Page: "Coming Soon" Tabs

**File**: `src/app/(authenticated)/[workspace]/profile/page.tsx` (lines 136-137)

- Notifications tab: "Coming soon. Configure email and in-app notification settings."
- Personal tokens tab: "Coming soon. Generate tokens for CLI and CI integration."

### 3.11 Scanner Engines: Stubbed Actions

**File**: `src/app/(authenticated)/[workspace]/scanner-engines/page.tsx`

- "Probe all" → toast "not yet implemented"
- "Apply changes" → toast "not yet implemented"

### 3.12 Knowledge Base: No-op Edit/Disable

**File**: `src/app/(authenticated)/[workspace]/knowledge-base/page.tsx` (lines 218-219)

`onEdit={() => {}}` dan `onDisable={() => {}}` — no-ops.

### 3.13 Source Control: `handleTest` Fakes Result

**File**: `src/app/(authenticated)/[workspace]/source-control/page.tsx` (line 153)

`handleTest` cuma nunggu 1.5 detik lalu return success tanpa benar-benar test koneksi.

### 3.14 Feature: `AddModelModal`/`EditModelModal` Uses Raw `fetch()`

**File**: `src/features/model/AddModelModal.tsx`, `EditModelModal.tsx`

Model discovery pakai `fetch()` langsung, bukan TanStack Query hook — bypass auth interceptor.

### 3.15 Feature: `ConfigureModal.tsx` Uses Imperative API Calls

**File**: `src/features/source-control/ConfigureModal.tsx` (line 114)

Panggil `sourceControlApi.testProvider()` langsung, bukan lewat module hooks.

### 3.16 Feature: `FindingComments.tsx` — Entirely Client-Side

**File**: `src/features/findings/FindingComments.tsx`

Comments cuma di local state (`useState`), tidak pernah dikirim ke server.

### 3.17 Provider Config: Anthropic Base URL Missing `/v1`

**File**: `src/features/model/providers.ts`

`https://api.anthropic.com` should be `https://api.anthropic.com/v1`

### 3.18 GateResultsTable: `workspaceId` Prop Ignored

**File**: `src/features/quality-gates/GateResultsTable.tsx` (line 21)

`_props` pattern — parameter diterima tapi tidak dipakai. Query tidak passing params.

---

## 4. 🟢 LOW — Minor / Kosmetik

### 4.1 AppShell: Hamburger Unicode Instead of Icon

**File**: `src/components/layout/AppShell.tsx` (line 166)

`☰` (unicode) instead of `<FaIcon icon="fa-bars" />`.

### 4.2 AppShell: Mobile Overlay Not Keyboard-Accessible

**File**: `src/components/layout/AppShell.tsx`

`<div>` with `onClick` + `aria-label` — seharusnya `<button>` atau `role="button"` + `tabIndex`.

### 4.3 AppShell: Sidebar Nav Data Hardcoded

**File**: `src/components/layout/AppShell.tsx` (lines 99-139)

Navigation items didefinisikan inline sebagai JS object, bukan dari config constants.

### 4.4 WorkspaceSwitcher: "Profile" dan "Account Security" Dead

**File**: `src/components/layout/WorkspaceSwitcher.tsx` (lines 94-102)

Tombol "Profile" dan "Account security" cuma close menu — tidak navigasi ke mana-mana.

### 4.5 LoadingState: Confusing Size Mapping

**File**: `src/components/shared/LoadingState.tsx`

Size `'medium'` di- pass-through ke Ant Design — works tapi confusing karena `'default'` juga ada di union.

### 4.6 TeamDetailDrawer: Uses Raw `Table` Instead of `DataTable`

**File**: `src/features/teams/TeamDetailDrawer.tsx`

### 4.7 GateResultsTable: Uses Raw `Table` Instead of `DataTable`

**File**: `src/features/quality-gates/GateResultsTable.tsx`

### 4.8 ConfirmDialog: `confirmAsync` Missing `loading` Prop

**File**: `src/components/shared/ConfirmDialog.tsx`

`okButtonProps` spread tidak include `loading: options.loading`.

### 4.9 7 Modules Missing `api` Re-export from `index.ts`

ai-models, audit, notifications, reports, schedules, webhooks, quality-gates, repositories.

---

## 5. ✅ STRENGTHS — What's Done Right

### 5.1 Test Coverage (Strong Areas)

| Module | Unit | E2E API | E2E UI | Total |
|---|---|---|---|---|
| Auth | ✅ 41 | ✅ 27 | ✅ 28 | **96** |
| Workspace | ✅ 34 | ✅ 33 | ✅ 15 | **82** |
| Project | ✅ 25 | ✅ 14 | ✅ 15 | **54** |
| Teams | ✅ 20 | ✅ 12 | ✅ 25 | **57** |
| Scan/Findings | ✅ 22 | ✅ 14 | ❌ minimal | **38** |
| Quality Gates | ✅ 15 | ✅ 4 | — | **19** |
| Storage | ✅ 33 | — | — | **33** |
| Source Control | ✅ 6 | ✅ 8 | ✅ 10 | **24** |
| Repositories | ✅ 18 | ✅ 4 | — | **22** |
| Profile | ✅ 15 | ✅ 5 | — | **20** |
| Scanner Engines | ✅ 5 | ✅ 2 | — | **7** |
| Knowledge Base | ✅ 15 | ✅ 3 | — | **18** |
| AI Models | ✅ 12 | ✅ 3 | — | **15** |
| Webhooks | ✅ 11 | ✅ 4 | — | **15** |

### 5.2 No `@ts-ignore` / `@ts-expect-error` — Zero

### 5.3 No `console.log` in Production Components

### 5.4 Consistent 4-State Pattern (LoadingState, EmptyState, ErrorState)

Used correctly by: Quality Gates page, AI Models page, EditProjectPage, EditTeamPage, ProjectDetailPage, Knowledge Base page, WorkspaceGeneralSettings, GateResultsTable

### 5.5 Consistent Mutation + Invalidation Pattern

All auth forms use `createZodSync` + Zod schemas. Most CRUD pages use proper mutation hooks.

### 5.6 Clean Code Quality

- 0 TODO/FIXME comments in `src/`
- 100% `'use client'` coverage on client components
- 0 bare `<Spin>` usage
- Consistent theme via `theme.useToken()`

---

## 6. 📋 PRIORITY ACTION ITEMS

### 🚨 Week 1 (Critical)

| # | Task | Area |
|---|------|------|
| 1 | Fix Profile module API paths — add `/api/v1` prefix | Client Module |
| 2 | Fix Scan module polling — pass `refetchInterval` to `useQuery` options | Client Module |
| 3 | Fix Quality-Gates cache collision — unique query keys per hook | Client Module |
| 4 | Remove `window.__accessToken` pattern — use axios interceptor | Pages |
| 5 | Implement or remove `audit`, `notifications`, `schedules` route handlers | API Routes |

### 🔴 Week 2 (High)

| # | Task | Area |
|---|------|------|
| 6 | Extract report download logic to service layer (510 lines → service) | API Routes |
| 7 | Replace `null` returns in 6 drawers with `EmptyState` | Feature Components |
| 8 | Fix 5 route handlers that bypass service layer | API Routes |
| 9 | Add error handling to Scan page (all 3 queries) | Pages |
| 10 | Fix Findings detail fragile type assertions | Pages |
| 11 | Implement `VerificationSettingsCard` actual API integration | Feature Components |

### 🟡 Week 3-4 (Medium)

| # | Task | Area |
|---|------|------|
| 12 | Add `ErrorState` to 3 tables (Repositories, Members, Invitations) | Feature Components |
| 13 | Add `ErrorState` to 4 inline error displays | Feature Components |
| 14 | Consolidate duplicate types (ProjectFormInput, TeamFormInput) | Feature Components |
| 15 | Fix `workspace-settings` module — add api.ts, keys.ts, use axios client | Client Module |
| 16 | Add Zod schema to Forgot Password page | Pages |
| 17 | Fix FindingActions `any` type | Feature Components |
| 18 | Add mutation hooks for Knowledge module | Client Module |
| 19 | Implement Knowledge Base edit/disable actions | Pages |

### 🟢 Week 5 (Low / Cleanup)

| # | Task | Area |
|---|------|------|
| 20 | Replace AppShell hamburger unicode with FaIcon | Shared Components |
| 21 | Fix AppShell mobile overlay keyboard accessibility | Shared Components |
| 22 | Fix/remove DataTable dead sort state | Shared Components |
| 23 | Implement or remove FilterControl date/dateRange types | Shared Components |
| 24 | Fix WorkspaceSwitcher dead menu items | Shared Components |
| 25 | Add E2E UI tests for Scan screen | Tests |
| 26 | Add Health endpoint tests | Tests |

---

## 7. 📊 Coverage Gaps Matrix

| Module | Unit Tests | E2E API Tests | E2E UI Tests | Route Handler | Client Module | Feature Component |
|---|---|---|---|---|---|---|
| Auth | ✅ Full | ✅ Full | ✅ Full | ⚠️ 4 bypass service | ✅ Full | ✅ Full |
| Workspace | ✅ Full | ✅ Full | ✅ Full | ⚠️ 2 inline filter | ✅ Full | ✅ Full |
| Project | ✅ Full | ✅ Full | ✅ Full | ✅ Clean | ✅ Full | ⚠️ 2 null return |
| Teams | ✅ Full | ✅ Full | ✅ Full | ✅ Clean | ✅ Full | ⚠️ raw Table, null return |
| Scan/Findings | ✅ Full | ✅ Full | ❌ Smoke only | ⚠️ inline loop | 🚨 polling bug | ⚠️ 2 null return, any type |
| Quality Gates | ✅ Full | ❌ Minimal | — | ✅ Clean | 🚨 cache collision | ⚠️ workspaceId ignored |
| Storage | ✅ Full | — | — | N/A | N/A | N/A |
| Source Control | ✅ Full | ✅ Full | ✅ Full | ⚠️ duplicated helper | ✅ Full | ⚠️ imperative API calls |
| Repositories | ✅ Full | ❌ Minimal | — | 🚨 inline DB query | ⚠️ duplicate hook | ⚠️ null return, fake actions |
| Profile | ✅ Full | ❌ Minimal | — | ✅ Clean | 🚨 wrong paths | ⚠️ hardcoded email |
| Scanner Engines | ❌ Minimal | ❌ Minimal | — | ✅ Clean | ✅ Full | ⚠️ stubbed actions |
| Knowledge Base | ✅ Full | ❌ Minimal | — | ✅ Clean | ⚠️ no mutation hooks | ⚠️ no-op edit/disable |
| AI Models | ✅ Full | ❌ Minimal | — | 🚨 inline SSRF check | ✅ Full | ⚠️ raw fetch, no-op save |
| Webhooks | ✅ Full | ❌ Minimal | — | ⚠️ direct repo call | ⚠️ orphaned key | ✅ Full |
| Health | ❌ 0 | ❌ 0 | — | ✅ Clean | N/A | N/A |
| Mail | ❌ 0 (mocked) | — | — | N/A | N/A | N/A |
| Reports | ❌ 0 | ❌ 0 | — | 🚨 510-line inline | ✅ Full | ⚠️ null return, placeholder |
| Integrations | ❌ 0 | ❌ 0 | — | N/A | N/A | N/A |
| Audit | ❌ 0 | ❌ 0 | — | ❌ No routes | 🚨 BROKEN | N/A |
| Notifications | ❌ 0 | ❌ 0 | — | ❌ No routes | 🚨 BROKEN | N/A |
| Schedules | ❌ 0 | ❌ 0 | — | ❌ No routes | 🚨 BROKEN | ⚠️ optimistic success |
| Arena | ❌ 0 | ❌ 0 | — | N/A | N/A | N/A (Coming Soon) |

---

*Report generated by multi-agent audit workflow — 6 parallel agents covering ~350 files across all application layers.*

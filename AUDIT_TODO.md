# Audit Fix TODO — Remaining Issues

> Status: 14/30 fixed, 12/30 broken, 4/30 partial
> Generated: 2026-06-11

---

## 🔴 P0 — Must Fix Before Production

### [ ] 1. Migration: Create missing DB tables
`source_control_repositories` dan `source_control_imports` defined di schema TAPI tidak ada migration yang membuatnya → **runtime crash**.
- **File**: `drizzle/schema/source-controls.ts:16-46`
- **Action**: Buat migration `0003_fix_missing_tables.sql` + register di `_journal.json`
- **Detail**: Kedua tabel ini akan menyebabkan query crash di runtime

### [ ] 2. Add middleware.ts
**No server-side auth guard** — semua auth guards hanya client-side. HTML protected routes terkirim sebelum redirect.
- **Action**: Buat `src/middleware.ts` dengan Next.js middleware untuk route protection
- **Referensi**: Pattern dari Next.js docs + `authenticate()` di `src/server/http/authenticate.ts`

### [ ] 3. Add auth to storage route
`storage/[...path]/route.ts` → **NO AUTH**. Anyone can access files without token.
- **File**: `src/app/api/v1/storage/[...path]/route.ts:9`
- **Action**: Tambah `authenticate(request)` + permission check

### [ ] 4. Fix VerificationSettingsCard
Form controls with NO submission → changes lost on unmount.
- **File**: `src/features/model/VerificationSettingsCard.tsx`
- **Action**: Add `onFinish` handler, submit button, mutation call

### [ ] 5. Fix ProjectForm fake save
`message.success()` + `router.push()` — **no API mutation**.
- **File**: `src/features/projects/ProjectForm.tsx:32`
- **Action**: Add actual mutation call before success + redirect

### [ ] 6. Fix DELETE endpoints — return 204
11 endpoints return 200 instead of 204 No Content.
- **Files**: members, invitations, projects, api-tokens, webhooks, teams, models, source-controls, imports, reports, avatar
- **Action**: Ganti `ApiResponse.success()` dengan `ApiResponse.noContent()`

### [ ] 7. Fix signout route — use ApiResponse
Still uses raw `NextResponse.json()` instead of `ApiResponse`.
- **File**: `src/app/api/v1/auth/signout/route.ts:29-34`
- **Action**: Use `ApiResponse.success()` or keep raw if cookies need setting (check)

### [ ] 8. Add loading.tsx + error.tsx boundaries
Zero `loading.tsx` across entire app. Only 1 `error.tsx` at root.
- **Action**: Add `loading.tsx` + `error.tsx` for: `(authenticated)`, `[workspace]`, `(unauthenticated)`, `(public)`

### [ ] 9. Fix signinSchema — add max length
`z.string().min(1)` — **no max length** → DoS vector.
- **File**: `src/commons/schemas/auth.schema.ts:24`
- **Action**: `z.string().min(1).max(128)`

### [ ] 10. Consolidate duplicate quality gates
Two separate implementations operating on same tables.
- **Files**: `src/server/modules/quality-gates/` vs `src/server/modules/scan/services/quality-gate.service.ts`
- **Action**: Merge into one module, delete the other

### [ ] 11. Fix ScanRow.status type mismatch
`ScanRow.status` uses `"Running" | "Completed" | "Failed"` (TitleCase) but `ScanStatus` type uses lowercase → **type incompatibility**.
- **File**: `src/commons/types/domain.ts:198`
- **Action**: Unify — either use `ScanStatus` type or align with actual data

### [ ] 12. Add Zod validation for JWT payload
`jwt.service.ts:60` uses `as unknown as TokenPayload` — no runtime validation.
- **File**: `src/server/modules/auth/services/jwt.service.ts:60`
- **Action**: Use `TokenPayloadSchema.parse(payload)` instead of raw cast

---

## 🟡 P1 — High Priority

### [ ] 13. Fix reset-password inline schema — add confirmPassword
Route defines inline schema that **lacks confirmPassword + .refine()**.
- **File**: `src/app/api/v1/auth/reset-password/route.ts:13`
- **Action**: Import and use shared `resetPasswordSchema` from `auth.schema.ts`

### [ ] 14. Fix scan upload validation — use Zod
Currently hand-rolled checks (`if (!projectId)`) instead of Zod `validateBody`.
- **File**: `src/app/api/v1/workspaces/[workspaceId]/scans/upload/route.ts:36-51`
- **Action**: Create Zod schema for upload payload + use `validateBody`

### [ ] 15. Fix comments feature — add API persistence
`FindingComments.tsx` uses local state only — never persists.
- **File**: `src/features/findings/FindingComments.tsx:19`
- **Action**: Add API fetch + mutation, replace local state with React Query

### [ ] 16. Add avatar upload validation — file size + MIME
No file size check, no MIME type validation.
- **File**: `src/server/modules/profile/profile.repository.ts:38-53`
- **Action**: Add `file.size <= MAX_AVATAR_SIZE`, validate `file.type`

### [ ] 17. Clean up dead code files
- `src/features/ai-models/ModelModals.tsx` (replaced by model/AddModelModal.tsx)
- `src/components/layout/PublicNavbar.tsx` (unused — layout has inline navbar)
- `src/commons/constants/source-control.ts` (dead module, zero imports)
- `src/commons/constants/navigation.ts` (dead module, zero imports)
- `src/commons/constants/theme.ts` (empty comment-only file)
- `src/commons/types/pagination.ts` (zero imports)

---

## 🔵 P2 — Medium Priority

### [ ] 18. Add E2E test for refresh token flow
Security-critical path (token rotation + reuse detection) — no E2E coverage.
- **Action**: Add Playwright test for full refresh flow

### [ ] 19. Add unit tests for JWT service + authenticate middleware
Highest priority test gap — security-critical, zero coverage.
- **Files**: `jwt.service.ts`, `authenticate.ts`

### [ ] 20. Add unit tests for 4 scan parsers
Pure functions with clear contracts — ideal for testing, zero coverage.
- **Files**: `trivy.parser.ts`, `semgrep.parser.ts`, `gitleaks.parser.ts`, `flawfinder.parser.ts`

### [ ] 21. Remove serial mode from Playwright tests
Violates AGENTS.md — tests must be independent.
- **Files**: `workspace-members.spec.ts`, `workspace-chooser.spec.ts`

### [ ] 22. Update CLAUDE.md
Server modules listed: 4 of 23. Path `commons/tokens.ts` should be `commons/constants/tokens.ts`.
- **File**: `CLAUDE.md`

### [ ] 23. Update ROADMAP.md
M5-M7 marked "Planned" but fully implemented.
- **File**: `docs/ROADMAP.md`

### [ ] 24. Fix API.md scan upload path
Docs say `/projects/:projectId/scans/upload` — real path is `/workspaces/:workspaceId/scans/upload`.
- **File**: `docs/api/API.md`

### [ ] 25. Fix README.md dead link
`research/sast-integration/REPORT.md` — path doesn't exist.
- **File**: `README.md`

---

## ⚪ Future / Optional

- [ ] Pin Docker images to specific digests
- [ ] Add ESLint security plugins
- [ ] Add SECURITY.md
- [ ] Add ADR (Architecture Decision Records)
- [ ] Add `.github/workflows/` CI pipeline
- [ ] Add coverage thresholds in vitest.config.ts
- [ ] Fix `zod-sync.ts` async-in-new-Promise antipattern
- [ ] Remove unreachable ZodError catch blocks from routes
- [ ] Standardize error code conventions (constants vs raw strings)
- [ ] Add transaction to project service `setMembers`/`setTeams`
- [ ] Unify `generateSlug` into shared utility
- [ ] Delete `drizzle/seeds/permissions.ts` (dead)

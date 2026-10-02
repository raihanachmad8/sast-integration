# Refactoring TODO — SAST Integration Frontend

> **Created:** 2026-06-01
> **Status:** Pending
> **Purpose:** Comprehensive audit-driven refactoring to ensure consistency, type-safety, proper patterns, and TanStack Query readiness.

---

## Audit Summary

| Metric | Count |
|--------|-------|
| Total page.tsx files | 23 |
| Missing JSDoc | 16 |
| Using mock data directly | 19 |
| Missing 4-state handling | 12 |
| Hardcoded magic values | 14+ files |
| `return null` violations | 3 |
| TODO/FIXME comments | 1 (forbidden) |
| Direct mock data mutation | 1 |
| Shared component usage | 6 of 23 |
| Hand-built raw tables | 12 pages (should use DataTable) |
| Repeated form label style | 58+ occurrences across 10+ files |

---

## Root Causes

| Problem | Impact | Files Affected |
|---------|--------|----------------|
| No shared UI constants | Every page writes its own hex, pixel, variant maps → inconsistent | 14+ files |
| Types co-located with mockData | Types coupled to mock, hard to replace with API | findings, repositories |
| Display strings in data model | `'12 min ago'`, `'94%'` in data not display → API replacement fails | scan, repositories, findings |
| Magic values everywhere | `width:16`, `height:16` repeated 58+ times, hex colors inline | 14+ files |
| No 4-state handling | Loading hardcoded `false`, return null violates AGENTS.md rule #4 | 12 pages |
| Mock data mutation | findings/page.tsx mutates imported array directly → shared state bug | 1 file |

---

## Phase 1 — Foundation (Shared Constants & Components)

> **Why first:** All subsequent phases depend on these constants. Without this, every fix will be duplicated.

### 1.1 Create `src/lib/constants/ui.ts`
Extract all magic values into shared constants:
- `SEVERITY_VARIANT` — maps severity to StatusPill variant (critical→red, high→red, medium→amber, low→blue, info→slate)
- `FINDING_STATUS_VARIANT` — maps finding status to pill variant
- `CONNECTION_STATUS_VARIANT` — maps SCM connection status to pill variant
- `REPO_STATUS_VARIANT` — maps repository status to pill variant
- `SCAN_STATUS_VARIANT` — maps scan status to pill variant
- `ROLE_PILL_CLASS` — maps roles to CSS pill classes (consolidate from roleLabel.ts)
- `AVATAR_SIZES` — `{ sm: 20, md: 40, lg: 56 }` (replaces hardcoded width/height)
- `CHECKBOX_SIZE` — `16` (replaces repeated `width: 16, height: 16`)
- `ICON_SIZES` — `{ sm: 16, md: 18, lg: 20, xl: 24, xxl: 48 }` (replaces scattered sizes)
- `DATE_LOCALE` — `'en-US'` (from formatDate.ts hardcoded value)
- `DEFAULT_PAGE_SIZE_OPTIONS` — `['10', '25', '50']` (from tokens.ts)
- `DEFAULT_BRANCH` — `'main'` (from scan/page.tsx hardcoded fallback)

### 1.2 Create `src/components/shared/FormLabel.tsx`
Extract repeated form label pattern into reusable component:
```tsx
<FormLabel label="Team name" required optional="some hint">
  <input ... />
</FormLabel>
```
Replaces 58+ inline label blocks across: SourceControlModals, ScheduleModals, ScannerModals, PolicyModals, ModelModals, EntryModals, ProjectForm, TeamForm, security/page, profile/page

### 1.3 Create `src/components/shared/StatCard.tsx`
Extract duplicated summary card pattern from:
- `MemberSummaryCards.tsx` (lines 28-44)
- `ScanSummaryCards.tsx` (lines 28-73)
Both use identical `className="summary-grid"` + `className="summary-card"` with same inline styles.

### 1.4 Create `src/components/shared/DotIndicator.tsx`
Extract repeated dot indicator `{width:8, height:8, borderRadius:'var(--radius-pill)'}` from ScanSummaryCards (8 occurrences).

### 1.5 Fix `src/lib/tokens.ts`
- Ensure `PAGE_SIZE_OPTIONS` matches `TableFooter` default (currently `['10','25','50']` vs `['10','25','50','100','250']`)
- Use `WEIGHT_BOLD` constant in PageHeader instead of hardcoded `fontWeight: 700`
- Export token values so they can be imported by components

### 1.6 Fix `src/lib/hooks/useDebouncedValue.ts`
- Import `DEBOUNCE_DELAY_MS` from tokens.ts instead of magic number `300`

### 1.7 Fix `src/lib/api/client.ts`
- Throw `ApiRequestError` from `errors.ts` instead of raw `Error` for consistency

---

## Phase 2 — Data Layer (Types, Mock Data, Shape)

> **Why:** Fix types first so all consuming components are type-safe. Wrong types = wrong components.

### 2.1 Create `findings/_components/types.ts`
- Extract types from `mockData.ts` (Severity, Verdict, FindingStatus, FindingRow, FindingComment, ScannerEvidence, AiAnalysis)
- Fix `confidence: string` → `number | null` (0-100 or null for unverified; display `'—'` is a concern, not data)
- Fix status casing to consistent lowercase: `'open' | 'accepted' | 'needs_review' | 'fixed'`
- Use proper enum for scanner names (reference `SUPPORTED_SCANNERS` from scan constants)

### 2.2 Refactor `findings/mockData.ts`
- Separate business logic functions (`getMockScannerOutput`, `getMockAiAnalysis`, `getMockSourceCode`, `getMockAiSuggestion`) from data arrays
- Fix relative time strings (`'1 hour ago'`) → ISO 8601 timestamps
- Fix severity casing inconsistencies (`'WARNING'`/`'ERROR'` vs `'critical'`/`'high'`)

### 2.3 Create `repositories/_components/types.ts`
- Extract `RepositoryRow` type from `mockData.ts`
- Fix `lastScan: '12 min ago'` → ISO 8601 timestamp
- Fix `status: string` → use shared constant type

### 2.4 Refactor `repositories/mockData.ts`
- Separate types from data
- Fix magic strings

### 2.5 Fix `scan/types.ts`
- Remove duplicate `ScmProvider` and `RepositoryConnectionType` (already in `@/commons/constants/scan`)
- Fix `ScanRow.status` vs `ScanDetail.status` casing inconsistency (`'Running'` vs `'queued'`)
- Fix `AiVerdict` type — 5 variants but `AiRichAnalysis.verdict` only allows 3

### 2.6 Fix `scan/mockData.ts`
- Fix `ScanRow.ai: '12/15'` → structured `{verified: number, total: number}`
- Fix `ScanRow.repoSub: 'main • 2 hours ago'` → structured `{branch: string, lastScanAgo: string}`
- Fix severity casing inconsistencies (`'WARNING'`/`'ERROR'` vs lowercase)

### 2.7 Fix `members/types.ts`
- Use `Role` from `@/commons/constants/permissions` for `Member.role` and `Invitation.role` (currently typed as `string`)
- Move `PILL_VARIANT` to `constants/ui.ts` (it's a value, not a type)

### 2.8 Fix `teams/_components/mockData.ts`
- Use ISO 8601 format for `Team.createdAt` and `TeamMember.joinedAt` (currently `'2026-01-15'`)

### 2.9 Fix `projects/_components/mockData.ts`
- Use repository IDs instead of display names in `Project.repositories`
- Use enum values for `Project.automation` instead of magic strings `['Auto scan', 'Gate enforced']`

---

## Phase 3 — Page Compliance (4-State, Return Null, Mutations)

> **Why:** AGENTS.md rule #4 is non-negotiable. Return null = blank screen during loading = bad UX.

### 3.1 Add 4-state handling to all pages
Replace `isLoading={false}` hardcoded with proper loading/empty/error states:
- `teams/page.tsx`
- `projects/page.tsx`
- `findings/page.tsx`
- `repositories/page.tsx`
- `reports/page.tsx`
- `scan-policies/page.tsx`
- `ai-models/page.tsx`
- `knowledge-base/page.tsx`
- `security/page.tsx`
- `schedules/page.tsx`
- `scanner-engines/page.tsx`
- `profile/page.tsx`

### 3.2 Fix `return null` violations
Replace with `LoadingState` component:
- `teams/page.tsx` line 25: `if (!workspaceId) return null;`
- `projects/page.tsx` line 25: `if (!workspaceId) return null;`
- `reports/page.tsx` line 34: `if (!report) return null;`

### 3.3 Replace ad-hoc loading states
Use `LoadingState` instead of `StatusPill 'Loading...'`:
- `integrations/source-control/page.tsx` line 153
- `integrations/webhooks/page.tsx` line 55

### 3.4 Fix dashboard hex colors
Replace `#0f766e`, `#2563eb`, `#dc2626`, `#7c3aed` in SVG `sparkColor` values with CSS variables (add to globals.css if needed).

### 3.5 Remove TODO comment
Delete `// TODO: Replace with real API call when managed scan execution is implemented` in `scan/page.tsx` line 74 (forbidden per AGENTS.md rule #6).

### 3.6 Fix mock data mutation
`findings/page.tsx` directly mutates `MOCK_FINDINGS` array elements (lines 26, 36, 47, 58, 66, 81). Use `useState` with spread/copy instead.

---

## Phase 4 — Documentation (JSDoc)

> **Why:** AGENTS.md requires JSDoc on public functions. API consumers need @throws, @returns docs.

### 4.1 Add JSDoc to page.tsx files (16 missing)
- `[workspace]/page.tsx` (dashboard)
- `teams/page.tsx`
- `teams/new/page.tsx`
- `teams/[teamId]/edit/page.tsx`
- `projects/page.tsx`
- `projects/new/page.tsx`
- `projects/[projectId]/edit/page.tsx`
- `reports/page.tsx`
- `scan-policies/page.tsx`
- `ai-models/page.tsx`
- `knowledge-base/page.tsx`
- `security/page.tsx`
- `schedules/page.tsx`
- `scanner-engines/page.tsx`
- `profile/page.tsx`
- `quality-gates/page.tsx`

### 4.2 Add JSDoc to form components
- `teams/_components/TeamForm.tsx`
- `projects/_components/ProjectForm.tsx`

---

## Phase 5 — Consistency (Status Maps, DataTable, Pixel Values)

> **Why:** 12 pages build raw `<table>` instead of `DataTable`. Status ternary chains repeated 5x.

### 5.1 Create shared status-to-variant maps in `constants/ui.ts`
Extract inline ternary chains from:
- `source-control/page.tsx` line 74: `provider.status === 'Connected' ? 'teal' : ...`
- `source-control/page.tsx` line 205: `!row.imported ? 'amber' : ...`
- `RepositoryDetailDrawer.tsx` line 50: `repository.connection_type === 'scm' ? 'teal' : ...`
- `webhooks/page.tsx` lines 96, 102: status-based variant selection
- `findings/_components/FindingsTable.tsx`: severity variant selection

### 5.2 Replace hand-built tables with DataTable
12 pages with raw `<table>` that should use shared `DataTable`:
- findings, reports, scan-policies, ai-models, knowledge-base, security, schedules, scanner-engines, profile

### 5.3 Fix webhooks manual footer
Replace custom table-footer div in `webhooks/page.tsx` line 118 with shared `TableFooter`.

### 5.4 Replace hardcoded pixel values
Replace `width:16, height:16` and other scattered numeric pixel values with CSS variable tokens or constants from `constants/ui.ts`. Affects 14+ files.

### 5.5 Move formatDate locale
Move hardcoded `'en-US'` in `formatDate.ts` to `DATE_LOCALE` constant in `constants/ui.ts`.

---

## Phase 6 — Shared Component Docs

### 6.1 Add/improve JSDoc on shared components
- `DataTable.tsx` — loading text hardcoded `"Loading..."`
- `LoadingState.tsx` — iconSize values `18`, `28`, `22` magic
- `EmptyState.tsx` — `maxWidth: 320` magic
- `ErrorState.tsx` — `fontSize: 48` magic
- `PasswordStrength.tsx` — `height: 3`, `borderRadius: 2` magic

---

## Button Audit (All Features)

| Feature | Button | Action | Class | Status |
|---------|--------|--------|-------|--------|
| **Teams** | New team | Navigate `/teams/new` | `btn btn-primary` | ✅ |
| **Teams** | View | Opens TeamDetailDrawer | `btn btn-sm` | ✅ |
| **Teams** | Edit | Navigate `/teams/[id]/edit` | `btn btn-sm` | ✅ |
| **Projects** | New project | Navigate `/projects/new` | `btn btn-primary` | ✅ |
| **Projects** | View | Opens ProjectDetailDrawer | `btn btn-sm` | ✅ |
| **Projects** | Edit | Navigate `/projects/[id]/edit` | `btn btn-sm` | ✅ |
| **Findings** | Bulk actions | Accept/Reject/Snooze | `btn btn-sm btn-primary` / `btn-danger` | ✅ |
| **Findings** | View | Opens FindingDetailDrawer | `btn btn-sm` | ✅ |
| **Scans** | Run scan | Opens RunScanDrawer | `btn btn-primary` | ✅ |
| **Scans** | View | Opens ScanDetailDrawer | `btn btn-sm` | ✅ |
| **Reports** | Generate report | Opens Modal | `btn btn-primary` | ✅ |
| **Reports** | View report | Opens ReportPreviewModal | `btn btn-sm` | ✅ |
| **Security** | Revoke | Destructive session action | `btn btn-sm btn-danger` | ✅ |
| **Security** | Change password | Opens Modal | `btn` | ✅ |
| **Source Control** | Connect | SCM connection | `btn btn-primary` | ✅ |
| **Source Control** | Disconnect | SCM disconnection | `btn btn-sm btn-danger` | ✅ |
| **Source Control** | Uninstall | Remove provider | `btn btn-sm btn-danger` | ✅ |
| **AI Models** | Install | Add model | `btn btn-primary` | ✅ |
| **AI Models** | Uninstall | Remove model | `btn btn-sm btn-danger` | ✅ |
| **Webhooks** | View logs | Opens Modal | `btn btn-sm` | ✅ |

No button gaps found. All buttons are wired with appropriate actions and consistent styling.

---

## Verification Steps

After each phase:
1. Run `npx tsc --noEmit` — ensure 0 source file errors
2. Grep for remaining hardcoded hex colors, magic numbers, TODO/FIXME
3. Verify all shared component imports resolve
4. Check that mock data shapes match types

---

## Dependencies

```
Phase 1 (Foundation)
  └── Phase 2 (Data Layer)
       └── Phase 3 (Page Compliance)
            └── Phase 4 (Documentation)
                 └── Phase 5 (Consistency)
                      └── Phase 6 (Shared Component Docs)
```

Phase 1 must be completed first. Phases 2-6 depend on Phase 1 constants.

---

## Notes for TanStack Query Migration

When real API is ready:
1. Replace `MOCK_*` imports with `useQuery` calls
2. `queryKey` should match the mock data variable names (e.g., `['teams']`, `['projects']`, `['findings']`)
3. `queryFn` should call the API client from `@/lib/api/client`
4. `invalidateQueries` targets already defined in queryKey structure
5. All mock data shapes must match API response shapes (hence Phase 2 fixes)
6. Loading/error/empty states already handled (hence Phase 3 fixes)

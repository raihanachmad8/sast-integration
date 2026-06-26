# Import/Export Consistency Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and fix all import/export inconsistencies across the frontend — barrel completeness, unused imports, default-vs-named consistency, naming mismatches, and duplicate re-exports.

**Architecture:** Fix barrel files to be complete and consistent. Remove unused imports. Convert remaining default exports to named exports. Eliminate duplicate re-exports. Standardize page imports to use barrels.

**Tech Stack:** TypeScript, Next.js App Router, React

## Global Constraints

- All components use named exports (no `export default function Component`)
- All barrel files re-export every public component from their directory
- All page files import from barrels (`@/features/xxx`) not deep paths (`@/features/xxx/ComponentName`)
- No duplicate names for the same component in barrel exports
- `import type` for type-only imports

---

## Task 1: Remove Unused Imports

**Files:**
- Modify: `src/features/landing/LandingHero.tsx:12,15`
- Modify: `src/features/scan/AiVerificationBadge.tsx:5`
- Modify: `src/app/api/v1/health/route.ts:1`

- [ ] **Step 1:** Remove `LANDING_DIMENSIONS` from the import on line 12 of `LandingHero.tsx`
- [ ] **Step 2:** Remove the `AiStatCard` import on line 15 of `LandingHero.tsx`
- [ ] **Step 3:** Remove `ENTITY_COLORS` import on line 5 of `AiVerificationBadge.tsx`
- [ ] **Step 4:** Remove `ApiResponse` import on line 1 of `health/route.ts`
- [ ] **Step 5:** Verify: `npx tsc --noEmit` passes

---

## Task 2: Fix `projects/index.ts` — Add Missing Exports

**Files:**
- Modify: `src/features/projects/index.ts`

- [ ] **Step 1:** Add missing exports to barrel:

```ts
export { ProjectsPageHeader } from './ProjectsPageHeader';
export { ProjectsTable } from './ProjectsTable';
export { ProjectFormModal } from './ProjectFormModal';
export { ProjectDetailDrawer } from './ProjectDetailDrawer';
export { ProjectForm } from './ProjectForm';
export { ProjectApiTokens } from './ProjectApiTokens';
export { EditProjectPage } from './EditProjectPage';
export { ProjectDetailPage } from './ProjectDetailPage';
export { ProjectListCard } from './ProjectListCard';
export { NewProjectPage } from './NewProjectPage';
export { ProjectsPage } from './ProjectsPage';
export type { Project } from '@/commons/types';
export type { ProjectFormInput } from './types';
```

- [ ] **Step 2:** Update page imports to use barrel:
  - `src/app/(authenticated)/[workspace]/projects/page.tsx`: change `from '@/features/projects/ProjectsPage'` → `from '@/features/projects'`
  - `src/app/(authenticated)/[workspace]/projects/new/page.tsx`: change `from '@/features/projects/NewProjectPage'` → `from '@/features/projects'`
  - `src/app/(authenticated)/[workspace]/projects/[projectId]/page.tsx`: change `from '@/features/projects/ProjectDetailPage'` → `from '@/features/projects'`
  - `src/app/(authenticated)/[workspace]/projects/[projectId]/edit/page.tsx`: change `from '@/features/projects/EditProjectPage'` → `from '@/features/projects'`

---

## Task 3: Fix `findings/index.ts` — Add Missing Exports

**Files:**
- Modify: `src/features/findings/index.ts`

- [ ] **Step 1:** Add missing exports to barrel:

```ts
export { FindingsTable } from './FindingsTable';
export { FindingDetailDrawer } from './FindingDetailDrawer';
export { FindingsPage } from './FindingsPage';
export { FindingActions } from './FindingActions';
export { BulkAssignModal } from './BulkAssignModal';
export { ScannerOutputSection } from './ScannerOutputSection';
export type { Finding, ScannerEvidence, AiAnalysis } from '@/commons/types';
```

- [ ] **Step 2:** Convert `FindingsPage.tsx` from default export to named export:
  - Change `export default function FindingsPage()` → `export function FindingsPage()`
- [ ] **Step 3:** Update page import:
  - `src/app/(authenticated)/[workspace]/findings/page.tsx`: change `import FindingsPage from '@/features/findings/FindingsPage'` → `import { FindingsPage } from '@/features/findings'`
  - `src/app/(authenticated)/[workspace]/findings/[id]/page.tsx`: change deep imports to barrel

---

## Task 4: Fix `scan/index.ts` — Add Missing Exports

**Files:**
- Modify: `src/features/scan/index.ts`

- [ ] **Step 1:** Add `FindingAiAnalysisCard` to barrel:

```ts
export { FindingAiAnalysisCard } from './FindingAiAnalysisCard';
```

- [ ] **Step 2:** Add `ScanSummaryCards` is already exported. Verify `FindingItem` is already exported. Both are present.

---

## Task 5: Fix `reports/index.ts` — Add PdfViewer + Convert Default Exports

**Files:**
- Modify: `src/features/reports/PdfViewer.tsx`
- Modify: `src/features/reports/ReportPreviewModal.tsx`
- Modify: `src/features/reports/index.ts`

- [ ] **Step 1:** Convert `PdfViewer.tsx` from default to named export:
  - Change `export default function PdfViewer({ data }: PdfViewerProps)` → `export function PdfViewer({ data }: PdfViewerProps)`
- [ ] **Step 2:** Convert `ReportPreviewModal.tsx` from default to named export:
  - Change `export default ReportPreviewModal` → keep as named (component is already defined as `const ReportPreviewModal = React.memo(...)`, just change the export line)
- [ ] **Step 3:** Update barrel:

```ts
export { ReportPreviewModal } from './ReportPreviewModal';
export { PdfViewer } from './PdfViewer';
export type { ReportPreviewModalProps } from './ReportPreviewModal';
```

---

## Task 6: Create `model/index.ts` + Fix `ai-models/index.ts`

**Files:**
- Create: `src/features/model/index.ts`
- Modify: `src/features/ai-models/index.ts`
- Delete: `src/features/model/ModelModals.tsx` (intermediate barrel, not needed)

- [ ] **Step 1:** Create `src/features/model/index.ts`:

```ts
export { EditModelModal } from './EditModelModal';
export { AddModelModal } from './AddModelModal';
export { VerificationSettingsCard } from './VerificationSettingsCard';
export { FallbackChainCard } from './FallbackChainCard';
export { PROVIDERS, ROLE_OPTIONS } from './providers';
```

- [ ] **Step 2:** Update `src/features/ai-models/index.ts`:

```ts
export { EditModelModal, AddModelModal } from '@/features/model';
```

- [ ] **Step 3:** Update page import:
  - `src/app/(authenticated)/[workspace]/ai-models/page.tsx`: change all `@/features/model/*` deep imports → `from '@/features/model'`

- [ ] **Step 4:** Delete `src/features/model/ModelModals.tsx`

---

## Task 7: Fix `quality-gates/index.ts` — Remove Duplicate Alias

**Files:**
- Modify: `src/features/quality-gates/index.ts`

- [ ] **Step 1:** Remove the `GateResultsTable` alias, keep only the actual export name:

```ts
export { GateConfigTable } from './GateResultsTable';
```

- [ ] **Step 2:** Check if any consumer uses `GateResultsTable` name and update to `GateConfigTable`.

---

## Task 8: Fix `source-control/index.ts` — Remove Duplicate ConfigureProviderModal

**Files:**
- Modify: `src/features/source-control/index.ts`
- Modify: `src/features/source-control/SourceControlModals.tsx`

- [ ] **Step 1:** Remove `ConfigureProviderModal` re-export from `SourceControlModals.tsx` (line 5 import alias + line 92 export). The barrel already exports `ConfigureModal` directly.
- [ ] **Step 2:** Update barrel to NOT re-export from SourceControlModals for ConfigureModal:

```ts
export { SetupGuideDrawer } from './SetupGuideDrawer';
export { ConfigureModal } from './ConfigureModal';
export { ImportRepoModal, SendTestEventModal, SyncResultsModal } from './SourceControlModals';
```

- [ ] **Step 3:** Update page import:
  - `src/app/(authenticated)/[workspace]/source-control/page.tsx`: change `ConfigureProviderModal` → `ConfigureModal`, import from barrel

---

## Task 9: Fix `scanner-engines/index.ts` — Filename Mismatch

**Files:**
- Modify: `src/features/scanner-engines/index.ts`
- Modify: `src/app/(authenticated)/[workspace]/scanner-engines/page.tsx`

- [ ] **Step 1:** Keep barrel as-is (exporting `RulesDrawer` from `ScannerModals` is fine — the barrel decouples filename from public API).
- [ ] **Step 2:** Update page to import from barrel:
  - Change `import { RulesDrawer } from '@/features/scanner-engines/ScannerModals'` → `import { RulesDrawer } from '@/features/scanner-engines'`

---

## Task 10: Fix `teams/index.ts` — Duplicate Type Source

**Files:**
- Modify: `src/features/teams/index.ts`

- [ ] **Step 1:** Change `TeamFormInput` re-export to use local types:

```ts
export type { TeamFormInput } from './types';
```

Instead of `from '@/modules/teams/types'`.

- [ ] **Step 2:** Verify `src/features/teams/types.ts` actually exports `TeamFormInput`.

---

## Task 11: Fix Remaining Page Imports to Use Barrels

**Files:**
- Modify: Multiple page.tsx files under `src/app/`

- [ ] **Step 1:** Fix these direct-to-file imports to use barrels:
  - `src/app/(unauthenticated)/auth-wrapper.tsx`: `AuthHero` → from `@/features/auth`
  - `src/app/(unauthenticated)/auth/signup/page.tsx`: `AuthForm, AuthField` → from `@/features/auth`
  - `src/app/(unauthenticated)/auth/signin/page.tsx`: `AuthForm, AuthField` → from `@/features/auth`
  - `src/app/(unauthenticated)/auth/forgot-password/page.tsx`: `AuthForm, AuthField` → from `@/features/auth`
  - `src/app/(authenticated)/[workspace]/schedules/page.tsx`: `AddScheduleModal, EditScheduleModal` → from `@/features/schedules`
  - `src/app/(authenticated)/[workspace]/knowledge-base/page.tsx`: `EditEntryModal, EntryDetailDrawer` → from `@/features/knowledge-base`
  - `src/app/(authenticated)/[workspace]/teams/page.tsx`: `TeamsPage` → from `@/features/teams`
  - `src/app/(authenticated)/[workspace]/teams/new/page.tsx`: `NewTeamPage` → from `@/features/teams`
  - `src/app/(authenticated)/[workspace]/teams/[teamId]/edit/page.tsx`: `EditTeamPage` → from `@/features/teams`
  - `src/app/(authenticated)/[workspace]/webhooks/page.tsx`: `WebhookFormModal` → add `webhooks/index.ts` barrel first
  - `src/app/(public)/page.tsx`: all 7 landing imports → from `@/features/landing`
  - `src/app/(authenticated)/[workspace]/scan/page.tsx`: keep `ScanRow, ScanFinding` type import from `./types`, component from barrel
  - `src/app/(authenticated)/[workspace]/source-control/page.tsx`: `SetupGuideDrawer` → from barrel

- [ ] **Step 2:** Create `src/features/webhooks/index.ts`:

```ts
export { WebhookFormModal } from './WebhookFormModal';
```

---

## Task 12: Verify Full Build

- [ ] **Step 1:** Run `npx tsc --noEmit` — expect zero errors
- [ ] **Step 2:** Run `npm run lint` — expect zero new errors
- [ ] **Step 3:** Spot-check 3-5 page files to confirm barrel imports resolve correctly

# UI Token Migration — Full Codebase Fix

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all hardcoded colors, font sizes, paddings, border-radius, and font weights with antd theme tokens (`theme.useToken()`) and project constants (`ENTITY_COLORS`, `LAYOUT`, `MODAL_WIDTH`) across 30 files with ~300 violations.

**Architecture:** Use `theme.useToken()` for spacing/sizing/color access. Use `ENTITY_COLORS` from `@/commons/constants/tokens` for status/entity colors. Use `LAYOUT`/`MODAL_WIDTH` from `@/commons/constants/layout` for dimensions. Landing pages are marketing components with custom dark themes — they get a dedicated `LANDING_TOKENS` constant file.

**Tech Stack:** React, Ant Design 5, TypeScript, Next.js App Router

## Global Constraints

- All component files MUST import `{ theme } from 'antd'` and call `const { token } = theme.useToken()` at the top of the component function
- Entity/status colors MUST use `ENTITY_COLORS` from `@/commons/constants/tokens` — never re定义 color maps
- Layout dimensions MUST use `LAYOUT` from `@/commons/constants/layout`
- Modal widths MUST use `MODAL_WIDTH` from `@/commons/constants/layout`
- `fontWeight` values MUST use `token.fontWeightStrong` (600) or explicit `token.fontWeightStrong` — no raw 500/600/700/800 unless the design specifically requires it
- `borderRadius` values MUST use `token.borderRadiusXS/SM/LG` etc. — pill shapes (999) are acceptable as-is
- Font sizes MUST use `token.fontSize/SM/LG/XL` or `token.fontSizeHeading1-5`
- Paddings/margins MUST use `token.padding/paddingXS/SM/LG/XL` or `token.margin/marginXS/SM/LG/XL`
- Landing pages are EXEMPT from strict token rules for custom dark-theme colors — create `LANDING_TOKENS` constant instead
- DO NOT change component behavior, only styling values
- DO NOT add comments unless absolutely necessary for clarification

---

## Task 1: Fix layout.ts Constants

**Files:**
- Modify: `src/commons/constants/layout.ts`

**Interfaces:**
- Consumes: none
- Produces: deduplicated layout constants

- [ ] **Step 1: Remove duplicate constants**

Remove the duplicate `SIDEBAR_WIDTH` (line 38), `SIDEBAR_COLLAPSED_WIDTH` (line 39), and `AVATAR_SIZES` (line 41). Keep the `LAYOUT.*` versions (lines 26-36) as the single source. Update any imports that reference the standalone `SIDEBAR_WIDTH` or `SIDEBAR_COLLAPSED_WIDTH`.

- [ ] **Step 2: Verify no broken imports**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors related to `SIDEBAR_WIDTH`, `SIDEBAR_COLLAPSED_WIDTH`, or `AVATAR_SIZES`

- [ ] **Step 3: Commit**

```bash
git add src/commons/constants/layout.ts
git commit -m "fix(constants): remove duplicate layout constants in layout.ts"
```

---

## Task 2: Fix ReportPreviewModal.tsx (Zero Token Usage)

**Files:**
- Modify: `src/features/reports/ReportPreviewModal.tsx`

**Interfaces:**
- Consumes: `theme.useToken()`, `token.*` values
- Produces: fully tokenized ReportPreviewModal

- [ ] **Step 1: Add useToken import and call**

Add `theme` to the antd import and add `const { token } = theme.useToken();` inside the component.

- [ ] **Step 2: Replace all hardcoded colors**

Replace:
- `'#999'` → `token.colorTextTertiary`
- `'#fafafa'` → `token.colorBgLayout`
- `'#f0f0f0'` → `token.colorBorderSecondary`
- `'#e8e8e8'` → `token.colorBorderSecondary`
- `'#666'` → `token.colorTextSecondary`
- `'#ff4d4f'` → `token.colorError`
- `'#52c41a'` → `token.colorSuccess`
- `'#fff'` → `token.colorBgContainer`

- [ ] **Step 3: Replace hardcoded font sizes**

Replace:
- `fontSize: 14` → `token.fontSize`
- `fontSize: 12` → `token.fontSizeSM`
- `fontSize: 13` → `token.fontSize`

- [ ] **Step 4: Replace hardcoded paddings**

Replace:
- `'6px 0'` → `` `${token.paddingXS}px 0` ``
- `'4px 8px'` → `` `${token.paddingXXS}px ${token.paddingXS}px` ``
- `'6px 8px'` → `` `${token.paddingXS}px ${token.paddingXS}px` ``
- `padding: 16` → `token.padding`

- [ ] **Step 5: Replace hardcoded border-radius**

Replace:
- `borderRadius: 8` → `token.borderRadius`

- [ ] **Step 6: Replace hardcoded fontWeight**

Replace:
- `fontWeight: 600` → `token.fontWeightStrong`

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "ReportPreviewModal"`
Expected: No errors

- [ ] **Step 8: Commit**

```bash
git add src/features/reports/ReportPreviewModal.tsx
git commit -m "fix(reports): replace all hardcoded values with antd tokens in ReportPreviewModal"
```

---

## Task 3: Fix PdfViewer.tsx (Zero Token Usage)

**Files:**
- Modify: `src/features/reports/PdfViewer.tsx`

**Interfaces:**
- Consumes: `theme.useToken()`
- Produces: fully tokenized PdfViewer

- [ ] **Step 1: Add useToken import and call**

Add `theme` to antd import, add `const { token } = theme.useToken();`

- [ ] **Step 2: Replace hardcoded values**

Replace:
- `'#525659'` → `token.colorBgElevated` (dark viewer background — keep as custom, but define via token or use `token.colorTextBase` for dark areas)
- `'#3b3e42'` → `token.colorFillSecondary`
- `'#fff'` → `token.colorTextLightSolid`
- `fontSize: 13` → `token.fontSize`
- `padding: '6px 12px'` → `` `${token.paddingXS}px ${token.paddingSM}px` ``
- `gap: 8` → `token.paddingXS`
- `borderRadius: 8` → `token.borderRadius`

Note: PdfViewer has a dark chrome theme. Use `token.colorFill` / `token.colorBgElevated` for the dark areas rather than hardcoded grays.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "PdfViewer"`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/reports/PdfViewer.tsx
git commit -m "fix(reports): replace hardcoded values with antd tokens in PdfViewer"
```

---

## Task 4: Fix Public Layout + Docs Pages

**Files:**
- Modify: `src/app/(public)/layout.tsx`
- Modify: `src/app/(public)/docs/layout.tsx`
- Modify: `src/app/(public)/docs/[slug]/page.tsx`

**Interfaces:**
- Consumes: `theme.useToken()`
- Produces: tokenized public pages

- [ ] **Step 1: Fix (public)/layout.tsx**

This file already imports `theme` but only uses it partially. Complete the tokenization:
- Replace `background: '#fff'` (hamburger bar) → `token.colorTextLightSolid`
- Replace `fontSize: 15` → `token.fontSize`
- Replace `fontSize: 14` → `token.fontSize`
- Replace `fontSize: 16` → `token.fontSizeLG`
- Replace `fontSize: 17` → `token.fontSizeLG`
- Replace `color: '#fff'` → `token.colorTextLightSolid`
- Replace `color: 'rgba(255,255,255,0.72)'` → `token.colorTextQuaternary`
- Replace `padding: '6px 13px'` → `` `${token.paddingXS}px ${token.paddingSM}px` ``
- Replace `borderRadius: 2` → `token.borderRadiusXS`
- Replace `borderRadius: 8` → `token.borderRadius`
- Replace `borderRadius: 10` → `token.borderRadiusLG`
- Replace `fontWeight: 500` → `token.fontWeightStrong`

- [ ] **Step 2: Fix docs/layout.tsx**

- Replace `fontSize: 12` → `token.fontSizeSM`
- Replace `fontSize: 14` → `token.fontSize`
- Replace `fontSize: 16` → `token.fontSizeLG`

- [ ] **Step 3: Fix docs/[slug]/page.tsx**

Add `theme` import and `useToken` call. Replace:
- `fontSize: 17` → `token.fontSizeLG`
- `fontWeight: 800` → `token.fontWeightStrong`
- `marginBottom: 32` → `token.marginXL`
- `paddingTop: 32` → `token.paddingXL`

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "public\|docs"`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add "src/app/(public)/layout.tsx" "src/app/(public)/docs/layout.tsx" "src/app/(public)/docs/[slug]/page.tsx"
git commit -m "fix(public): replace hardcoded values with tokens in public layouts and docs pages"
```

---

## Task 5: Fix AiVerificationBadge + CICDSetupModal (Named/Duplicate Colors)

**Files:**
- Modify: `src/features/scan/AiVerificationBadge.tsx`
- Modify: `src/features/scan/CICDSetupModal.tsx`

**Interfaces:**
- Consumes: `ENTITY_COLORS` from `@/commons/constants/tokens`
- Produces: consistent entity color usage

- [ ] **Step 1: Fix AiVerificationBadge.tsx named colors**

Replace the VERDICT_CONFIG color values:
- `color: 'red'` → `color: ENTITY_COLORS.verdict.TP.color` or use the Tag `color` prop with antd semantic values: `color="error"`
- `color: 'teal'` → `color="success"` (antds Tag accepts semantic color strings)
- `color: 'blue'` → `color="processing"`
- `color: 'gold'` → `color="warning"`

Alternatively, import `getStatusColor` from tokens and derive the color from `ENTITY_COLORS.verdict`.

- [ ] **Step 2: Fix CICDSetupModal.tsx duplicate provider colors**

Import `ENTITY_COLORS` from `@/commons/constants/tokens` and replace:
- `color: '#24292e'` → `color: ENTITY_COLORS.provider.github.color`
- `color: '#FC6D26'` → `color: ENTITY_COLORS.provider.gitlab.color`
- `color: '#478061'` → `color: ENTITY_COLORS.provider.gitea.color`

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "AiVerification\|CICDSetup"`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/scan/AiVerificationBadge.tsx src/features/scan/CICDSetupModal.tsx
git commit -m "fix(scan): use ENTITY_COLORS for verdict and provider colors"
```

---

## Task 6: Fix Remaining Scan + Dashboard + Project Features

**Files:**
- Modify: `src/features/scan/ScanTable.tsx`
- Modify: `src/features/dashboard/DashboardSummaryCards.tsx`
- Modify: `src/features/projects/ProjectsTable.tsx`
- Modify: `src/features/repositories/RepositoryDetailDrawer.tsx`
- Modify: `src/features/workspace/EmptyWorkspaceState.tsx`
- Modify: `src/features/teams/TeamsTable.tsx`
- Modify: `src/features/teams/EditTeamPage.tsx`
- Modify: `src/features/projects/EditProjectPage.tsx`
- Modify: `src/features/scanner-engines/ScannerModals.tsx`

**Interfaces:**
- Consumes: `theme.useToken()`
- Produces: tokenized feature components

- [ ] **Step 1: Fix ScanTable.tsx**

Replace `fontSize: 24` → `token.fontSizeHeading3`, `marginBottom: 8` → `token.marginXS`

- [ ] **Step 2: Fix DashboardSummaryCards.tsx**

Replace `fontSize: 32` → `token.fontSizeHeading1` (or keep 32 as a custom large stat number, but reference `token.fontSizeHeading1` which is 38, or define a custom token). Since 32 is between `token.fontSizeXL` (20) and `token.fontSizeHeading5` (16), and `token.fontSizeHeading1` is 38, the cleanest option is to use `token.fontSizeHeading1` and let the theme handle it.

Replace `fontWeight: 700` → `token.fontWeightStrong`

- [ ] **Step 3: Fix ProjectsTable.tsx**

Replace `fontSize: 14` → `token.fontSize` (×2 instances)

- [ ] **Step 4: Fix RepositoryDetailDrawer.tsx**

Replace `fontSize: 18` → `token.fontSizeLG`

- [ ] **Step 5: Fix EmptyWorkspaceState.tsx**

Replace `fontSize: 20` → `token.fontSizeXL`

- [ ] **Step 6: Fix TeamsTable.tsx**

Replace `fontWeight: 600` → `token.fontWeightStrong`

- [ ] **Step 7: Fix EditTeamPage.tsx + EditProjectPage.tsx**

Replace `fontWeight: 700` → `token.fontWeightStrong`

- [ ] **Step 8: Fix ScannerModals.tsx**

Replace `fontWeight: 500` → `token.fontWeightStrong` (or keep 500 and document why)

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "ScanTable\|Dashboard\|Projects\|Repository\|Empty\|Teams\|Scanner"`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/features/scan/ScanTable.tsx src/features/dashboard/DashboardSummaryCards.tsx src/features/projects/ProjectsTable.tsx src/features/repositories/RepositoryDetailDrawer.tsx src/features/workspace/EmptyWorkspaceState.tsx src/features/teams/TeamsTable.tsx src/features/teams/EditTeamPage.tsx src/features/projects/EditProjectPage.tsx src/features/scanner-engines/ScannerModals.tsx
git commit -m "fix(features): replace hardcoded values with tokens across scan, dashboard, projects, teams"
```

---

## Task 7: Fix Authenticated App Pages

**Files:**
- Modify: `src/app/(authenticated)/[workspace]/schedules/page.tsx`
- Modify: `src/app/(authenticated)/[workspace]/source-control/page.tsx`
- Modify: `src/app/(authenticated)/[workspace]/quality-gates/page.tsx`
- Modify: `src/app/(authenticated)/workspaces/page.tsx`
- Modify: `src/app/(authenticated)/[workspace]/profile/ProfileTab.tsx`

**Interfaces:**
- Consumes: `theme.useToken()`
- Produces: tokenized app pages

- [ ] **Step 1: Fix schedules/page.tsx**

Replace `fontSize: 12` → `token.fontSizeSM`, `fontSize: 13` → `token.fontSize`

- [ ] **Step 2: Fix source-control/page.tsx**

Replace `fontSize: 36` → `token.fontSizeHeading2`

- [ ] **Step 3: Fix quality-gates/page.tsx**

Replace `fontSize: 32` → `token.fontSizeHeading1`

- [ ] **Step 4: Fix workspaces/page.tsx**

Replace `fontSize: 18` → `token.fontSizeLG`

- [ ] **Step 5: Fix profile/ProfileTab.tsx**

Replace `fontSize: 22` → `token.fontSizeHeading3`, `fontSize: 12` → `token.fontSizeSM`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "schedule\|source-control\|quality-gate\|workspace\|ProfileTab"`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add "src/app/(authenticated)/[workspace]/schedules/page.tsx" "src/app/(authenticated)/[workspace]/source-control/page.tsx" "src/app/(authenticated)/[workspace]/quality-gates/page.tsx" "src/app/(authenticated)/workspaces/page.tsx" "src/app/(authenticated)/[workspace]/profile/ProfileTab.tsx"
git commit -m "fix(pages): replace hardcoded font sizes with tokens in authenticated pages"
```

---

## Task 8: Create Landing Tokens + Fix Landing Pages

**Files:**
- Create: `src/commons/constants/landing-tokens.ts`
- Modify: `src/features/landing/LandingHero.tsx`
- Modify: `src/features/landing/LandingFooter.tsx`
- Modify: `src/features/landing/LandingCTA.tsx`
- Modify: `src/features/landing/LandingMetrics.tsx`
- Modify: `src/features/landing/LandingHowItWorks.tsx`
- Modify: `src/features/landing/LandingTrust.tsx`
- Modify: `src/features/landing/LandingFeatures.tsx`

**Interfaces:**
- Consumes: antd `theme.useToken()` for spacing/sizing, `LANDING_TOKENS` for custom dark-theme colors
- Produces: tokenized landing pages

- [ ] **Step 1: Create landing-tokens.ts**

Create `src/commons/constants/landing-tokens.ts` with the dark-theme color palette used across all landing pages. This centralizes the ~60 hardcoded landing colors into one file.

```typescript
/**
 * Landing page dark-theme color tokens.
 * These are marketing-specific colors not covered by antd's light theme.
 * Use theme.useToken() for spacing/sizing — only use these for colors.
 */
export const LANDING_TOKENS = {
  bg: {
    dark: '#050f0d',
    darkAlt: '#0a1f1a',
    darkMid: '#0f2d26',
    darkDeep: '#082b26',
    darkEnd: '#04110e',
    code: '#0d1117',
    codeAlt: '#161b22',
    card: '#1e1b4b',
    cardAlt: '#312e81',
    white: '#ffffff',
  },
  text: {
    primary: '#e6edf3',
    secondary: 'rgba(255,255,255,0.75)',
    muted: 'rgba(255,255,255,0.45)',
    faint: 'rgba(255,255,255,0.35)',
    dim: 'rgba(255,255,255,0.3)',
  },
  accent: {
    teal: '#5eead4',
    tealDark: '#14b8a6',
    green: '#3fb950',
    red: '#f85149',
    yellow: '#f59e0b',
    gold: '#facc15',
    purple: '#a78bfa',
    purpleDark: '#7c3aed',
  },
  severity: {
    critical: '#f85149',
    criticalBg: 'rgba(248,81,73,0.12)',
    high: '#e3b341',
    highBg: 'rgba(227,179,65,0.12)',
    medium: '#58a6ff',
    mediumBg: 'rgba(88,166,255,0.12)',
    low: '#3fb950',
    lowBg: 'rgba(63,185,80,0.12)',
  },
  trafficLight: {
    red: '#ff5f57',
    yellow: '#febc2e',
    green: '#28c840',
  },
} as const;
```

- [ ] **Step 2: Fix LandingHero.tsx**

Import `LANDING_TOKENS`. Replace all hardcoded hex colors with `LANDING_TOKENS.*` references. Use `token.*` for spacing/sizing. This file has ~40 hardcoded colors, ~25 font sizes, ~15 paddings, ~8 border-radius values.

- [ ] **Step 3: Fix LandingFooter.tsx**

Import `LANDING_TOKENS`. Replace `#050f0d` → `LANDING_TOKENS.bg.dark`, `#0f766e` → `token.colorPrimary`, `#fff` → `LANDING_TOKENS.text.primary`. Use tokens for spacing.

- [ ] **Step 4: Fix LandingCTA.tsx**

Import `LANDING_TOKENS`. Replace gradient colors and `#fff` references. Use tokens for spacing.

- [ ] **Step 5: Fix LandingMetrics.tsx**

Import `LANDING_TOKENS`. Replace accent colors. Use tokens for spacing and font sizes.

- [ ] **Step 6: Fix LandingHowItWorks.tsx**

Import `LANDING_TOKENS`. Replace color references. Use tokens for spacing.

- [ ] **Step 7: Fix LandingTrust.tsx**

Use tokens for spacing and font sizes (this file is mostly clean on colors).

- [ ] **Step 8: Fix LandingFeatures.tsx**

Import `LANDING_TOKENS`. Replace accent color references. Use tokens for spacing.

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit 2>&1 | grep -i "landing\|Landing"`
Expected: No errors

- [ ] **Step 10: Commit**

```bash
git add src/commons/constants/landing-tokens.ts src/features/landing/
git commit -m "fix(landing): centralize dark-theme colors into LANDING_TOKENS, replace all hardcoded values"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: Zero errors

- [ ] **Step 2: Lint check**

Run: `npx next lint 2>&1 | tail -5`
Expected: No new errors

- [ ] **Step 3: Search for remaining hardcoded values**

Run: `rg "#[0-9a-fA-F]{3,8}" src/ --include "*.tsx" -g "!node_modules" -g "!.next" | grep -v "landing-tokens\|tokens.ts\|antd-theme\|node_modules" | head -30`
Expected: Minimal results — mostly in `landing-tokens.ts` definition and `antd-theme.ts`

- [ ] **Step 4: Commit if any cleanup needed**

```bash
git add -A
git commit -m "chore: final token migration cleanup"
```

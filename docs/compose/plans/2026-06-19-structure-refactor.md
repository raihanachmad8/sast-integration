# Structure Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align directory structure with PROJECT_STANDARDS.md by moving misplaced files and updating all imports.

**Architecture:** Move `src/components/` into `src/commons/`, `src/hooks/` into `src/lib/hooks/`, delete duplicate `src/types/`, then update 297 import statements across the codebase.

**Tech Stack:** TypeScript, Next.js 16, React 19

---

## File Moves

### src/components/shared/ → src/commons/components/ (35 files)
- AiAnalysisCard.tsx, CodeBlock.tsx, ComingSoonCard.tsx, ConfirmDialog.tsx, DataTable.tsx, EmptyState.tsx, ErrorBanner.tsx, ErrorBoundary.tsx, ErrorState.tsx, ExportButton.tsx, FaIcon.tsx, FeatureGate.tsx, FilterControl.tsx, IdentityCell.tsx, InfoRow.tsx, ListItem.tsx, LoadingState.tsx, MemberSelect.tsx, PageHeader.tsx, PasswordStrength.tsx, PermissionGate.tsx, RadioCardGroup.tsx, SectionCard.tsx, SectionLabel.tsx, StatCard.tsx, StatusPill.tsx, StatusTag.tsx, TabBar.tsx, TableFooter.tsx, Toolbar.tsx, ToggleRow.tsx, index.ts

### src/components/layout/ → src/commons/components/layout/ (4 files)
- AppShell.tsx, AuthenticatedShell.tsx, SidebarNav.tsx, WorkspaceSwitcher.tsx

### src/components/providers/ → src/commons/providers/ (2 files)
- AntdProvider.tsx, QueryProvider.tsx

### src/components/auth/ → src/features/auth/components/ (1 file)
- EmailVerificationBanner.tsx

### src/hooks/use-workspace.ts → src/lib/hooks/useWorkspace.ts (1 file, rename to camelCase)

### src/types/antd-theme.d.ts → DELETE (duplicate of commons/types/antd-theme.d.ts)

---

## Import Updates

### Pattern 1: @/components/shared/* → @/commons/components/*
278 occurrences across ~80 files

### Pattern 2: @/components/layout/* → @/commons/components/layout/*
~10 occurrences

### Pattern 3: @/components/providers/* → @/commons/providers/*
~5 occurrences

### Pattern 4: @/hooks/use-workspace → @/lib/hooks/useWorkspace
19 occurrences across 19 files

---

## Task 1: Move Files

- [ ] Create target directories
- [ ] Move shared components
- [ ] Move layout components
- [ ] Move providers
- [ ] Move auth components
- [ ] Move and rename use-workspace.ts
- [ ] Delete duplicate antd-theme.d.ts
- [ ] Remove empty src/components/, src/hooks/, src/types/ dirs

## Task 2: Update Imports

- [ ] Replace @/components/shared → @/commons/components
- [ ] Replace @/components/layout → @/commons/components/layout
- [ ] Replace @/components/providers → @/commons/providers
- [ ] Replace @/components/auth → @/features/auth/components
- [ ] Replace @/hooks/use-workspace → @/lib/hooks/useWorkspace

## Task 3: Verify

- [ ] Run pnpm build
- [ ] Run pnpm test
- [ ] Confirm no broken imports

# SAST-Integration Layout Pattern Inconsistency Audit

**Audited:** sast-integration/src/features/ and sast-integration/src/components/  
**Total files scanned:** 78 (.tsx files)  
**Date:** 2026-06-03

---

## Executive Summary

The codebase uses **4 different layout systems** with no clear standard:
1. Antd `<Flex>` component (dominant in newer/refactored files)
2. Raw `<div style={{ display: 'flex' }}>` (legacy/ad-hoc)
3. Antd `<Row>/<Col>` grid (used only in table filter areas)
4. CSS `display: 'grid'` (emerging pattern in form layouts)

**Verdict:** Each component largely does its own thing. There is no enforced grid system.

---

## 1. INLINE `display: 'flex'` ON RAW `<div>` vs ANT DESIGN `<Flex>` COMPONENT

### Files using raw `<div style={{ display: 'flex' }}>` (should be `<Flex>`):

| File | Line(s) | Pattern |
|------|---------|---------|
| features/repositories/RepositoryDetailDrawer.tsx | 39, 50, 121 | `<div style={{ display: 'flex', ... }}>` for header, body, section |
| features/projects/ProjectDetailDrawer.tsx | 27, 28, 41, 89 | `<div style={{ display: 'flex', ... }}>` for header, avatar, body, footer |
| features/teams/TeamDetailDrawer.tsx | 27, 28, 41, 70, 97 | `<div style={{ display: 'flex', ... }}>` for header, avatar, body, members list, footer |
| features/scan/ScanSummaryCards.tsx | 45, 48, 63, 66 | `<div style={{ display: 'flex', ... }}>` for card headers and stat rows |
| features/scan/NewScanModal.tsx | 220, 355, 374, 403, 509 | `<div style={{ display: 'flex', ... }}>` for modal option layouts |
| features/scan/ScanTimeline.tsx | 48 | `<div style={{ display: 'flex', ... }}>` for timeline dot |
| features/scan-policies/PolicyModals.tsx | 237, 249 | `<div style={{ display: 'flex', ... }}>` for policy template cards |
| features/scanner-engines/ScannerModals.tsx | 77 | `<div style={{ display: 'flex', ... }}>` for rule list items |
| features/members/MemberSummaryCards.tsx | 43 | `<div style={{ display: 'flex', ... }}>` for avatar/icon containers |
| features/projects/ProjectFormModal.tsx | 123 | `<div style={{ display: 'flex', ... }}>` for form header |
| features/source-control/SetupGuideDrawer.tsx | 146, 183 | `<div style={{ display: 'flex', ... }}>` for step icons |
| features/knowledge-base/EntryModals.tsx | 58, 65, 72 | `<Card styles={{ body: { display: 'flex', ... } }}>` for stat cards |
| features/findings/FindingDetailDrawer.tsx | 240 | Button with `display: 'flex'` inline for icon centering |
| components/layout/app-shell.tsx | 69, 280, 300, 324, 449 | `<div style={{ display: 'flex', ... }}>` for menu items and header |
| components/layout/public-navbar.tsx | 9 | `<Layout.Header style={{ display: 'flex', ... }}>` |
| components/shared/TabBar.tsx | 49 | `<div style={{ display: 'flex', gap: 4, ... }}>` |
| components/shared/RadioCardGroup.tsx | 36 | `<div style={{ display: 'flex', ... }}>` |

**Count:** 34+ instances of raw `display: 'flex'` inline vs ~73 uses of `<Flex>` component.

---

## 2. MIXED `<Row>/<Col>` vs `<Flex>` vs CSS Grid

### Files importing BOTH Row/Col AND Flex:

| File | Line | Row/Col Usage | Flex Usage |
|------|------|--------------|------------|
| features/findings/FindingsTable.tsx | 4 | `<Row gutter={[8,8]}>` + `<Col>` at L225-242 | `<Flex>` at L123, 152, 204 |
| features/findings/FindingDetailDrawer.tsx | 4 | `<Row gutter={[token.marginSM, token.marginSM]}>` at L186 | `<Flex>` at L115, 116, 124, 139, 142, 146, 155 |
| features/members/MembersTable.tsx | 4 | `<Row gutter={[token.marginSM, token.marginSM]}>` at L101 | `<Flex>` at L85 |
| features/members/MemberSummaryCards.tsx | 3 | `<Row gutter={[token.marginMD, token.marginMD]}>` at L37 | `<Flex>` at L41 |
| features/scan/ScanTable.tsx | 4 | `<Row gutter={[token.marginSM, token.marginSM]}>` at L237 | (Flex imported but used elsewhere) |
| features/scan/ScanSummaryCards.tsx | 3 | `<Row gutter={[token.marginMD, token.marginMD]}>` at L34 | `<Flex>` (imported, used for inner layout) |
| features/repositories/RepositoriesTable.tsx | 4 | `<Row gutter={[12, 12]}>` at L152 | (Flex imported) |

### Files using ONLY Row/Col (no Flex):

| File | Line |
|------|------|
| features/schedules/ScheduleModals.tsx | 48-69, 103-124 |

### Files using ONLY Flex (no Row/Col):

Most files — this is the dominant pattern. 33 files import Flex but only 9 import Row/Col.

**Note:** Components never import both Row/Col and Flex without actually using both in layout. When both are present, Row/Col is always used for table filter grids, while Flex handles everything else. This is a soft consistency but undocumented.

---

## 3. HARDCODED GAP VALUES (hardcoded numbers vs token references)

### Hardcoded numeric gap values in inline styles:

| File | Line | Gap Value | Should Be |
|------|------|-----------|-----------|
| components/layout/app-shell.tsx | 69 | `gap: 12` | `token.paddingSM` or similar |
| components/layout/app-shell.tsx | 280 | `gap: 10` | `token.paddingXS` or similar |
| components/layout/app-shell.tsx | 300 | `gap: 10` | `token.paddingXS` or similar |
| components/layout/app-shell.tsx | 324 | `gap: 10` | `token.paddingXS` or similar |
| components/layout/app-shell.tsx | 449 | `gap: 12` | `token.paddingSM` or similar |
| components/layout/app-shell.tsx | 471 | `gap: 8` | `token.paddingXS` or similar |
| components/shared/TabBar.tsx | 49 | `gap: 4` | `token.paddingXXS` or similar |
| features/teams/TeamDetailDrawer.tsx | 27 | `gap: 8` | `token.paddingXS` |
| features/projects/ProjectDetailDrawer.tsx | 27 | `gap: 8` | `token.paddingXS` |
| features/repositories/RepositoryDetailDrawer.tsx | 39 | `gap: 8` | `token.paddingXS` |
| features/repositories/RepositoryDetailDrawer.tsx | 50 | `gap: 24` | `token.paddingLG` |
| features/repositories/RepositoryDetailDrawer.tsx | 121 | `gap: 12` | `token.paddingSM` |
| features/repositories/RepositoryDetailDrawer.tsx | 107 | `gap: 12` (CSS Grid) | `token.paddingSM` |
| features/members/InviteMemberModal.tsx | 67 | `gap: 12` (CSS Grid) | `token.paddingSM` |
| features/members/InviteMemberModal.tsx | 98 | `gap: 4` (CSS Grid) | `token.paddingXXS` |
| features/members/ChangeRoleModal.tsx | 75 | `gap: 12` (CSS Grid) | `token.paddingSM` |
| features/members/ChangeRoleModal.tsx | 82 | `gap: 4` (CSS Grid) | `token.paddingXXS` |
| features/projects/ProjectFormModal.tsx | 123 | `gap: 16` | `token.paddingMD` |
| features/findings/FindingsTable.tsx | 204 | `gap={8}` (Flex prop) | `token.paddingXS` |

### Hardcoded numeric gap in `<Flex>` components (antipattern — should use token):

| File | Line | Gap Value |
|------|------|-----------|
| features/findings/FindingsTable.tsx | 123 | `gap={2}` |
| features/findings/FindingsTable.tsx | 152 | `gap={4}` |
| features/findings/FindingsTable.tsx | 204 | `gap={8}` |
| features/projects/ProjectsTable.tsx | 81 | `gap={4}` |
| features/projects/ProjectsTable.tsx | 129 | `gap={4}` |
| features/knowledge-base/EntryModals.tsx | 104 | `gap={4}` |

### String-based gap values (inconsistent with numeric approach):

| File | Line | Value |
|------|------|-------|
| components/shared/FilterControl.tsx | 97 | `gap="middle"` |
| components/shared/FilterControl.tsx | 98 | `gap="middle"` |
| components/shared/FilterControl.tsx | 123 | `gap="small"` |
| components/shared/PageHeader.tsx | 58 | `gap="middle"` |
| components/shared/Toolbar.tsx | 46 | `gap="middle"` |
| components/shared/Toolbar.tsx | 50 | `gap="middle"` |

---

## 4. HARDCODED PADDING VALUES (raw numbers vs token references)

| File | Line | Value | Should Be |
|------|------|-------|-----------|
| features/findings/FindingsTable.tsx | 204 | `padding: '4px 16px'` | Token-based |
| features/findings/FindingsTable.tsx | 224 | `padding: 12` | `token.paddingSM` |
| features/projects/ProjectsTable.tsx | 95 | `padding: 12` | `token.paddingSM` |
| features/members/InvitationsTable.tsx | 107 | `padding: 12` | `token.paddingSM` |
| features/members/MembersTable.tsx | 100 | `padding: 12` | `token.paddingSM` |
| features/members/InviteMemberModal.tsx | 98 | `padding: 12` | `token.paddingSM` |
| features/members/ChangeRoleModal.tsx | 76 | `padding: '9px 11px'` | `token.paddingXS/SM` |
| features/members/ChangeRoleModal.tsx | 82 | `padding: 12` | `token.paddingSM` |
| features/repositories/RepositoriesTable.tsx | 149 | `padding: 12` | `token.paddingSM` |
| features/scan/ScanTable.tsx | 234 | `padding: 12` | `token.paddingSM` |
| features/scan/NewScanModal.tsx | 386 | `padding: '1px 4px'` | Token-based |
| components/layout/app-shell.tsx | 280 | `padding: '4px 0'` | Token-based |

---

## 5. INLINE ALIGNMENT PROPERTIES (alignItems/justifyContent in style objects)

### Inline alignment on raw `<div>` (should be `<Flex>` props):

| File | Line | Properties |
|------|------|------------|
| components/layout/app-shell.tsx | 77-78 | `alignItems: 'center', justifyContent: 'center'` |
| components/layout/app-shell.tsx | 441-442 | `alignItems: 'center', justifyContent: 'space-between'` |
| components/layout/app-shell.tsx | 470 | `alignItems: 'center'` |
| components/layout/public-navbar.tsx | 9 | `alignItems: 'center', justifyContent: 'space-between'` |
| components/shared/RadioCardGroup.tsx | 37 | `alignItems: 'flex-start'` |
| features/scan/NewScanModal.tsx | 221-222 | `alignItems: 'center', justifyContent: 'center'` |
| features/scan/NewScanModal.tsx | 356-357 | `alignItems: 'center', justifyContent: 'center'` |
| features/scan/NewScanModal.tsx | 375-376 | `alignItems: 'center', justifyContent: 'center'` |
| features/scan/NewScanModal.tsx | 404-405 | `alignItems: 'center', justifyContent: 'center'` |
| features/scan/NewScanModal.tsx | 510-511 | `alignItems: 'center', justifyContent: 'space-between'` |
| features/scan/ScanTimeline.tsx | 49-50 | `alignItems: 'center', justifyContent: 'center'` |
| features/scan-policies/PolicyModals.tsx | 238 | `alignItems: 'center'` |
| features/scan/ScanSummaryCards.tsx | 45 | `justifyContent: 'space-between', alignItems: 'flex-start'` |
| features/scan/ScanSummaryCards.tsx | 63 | `justifyContent: 'space-around', alignItems: 'flex-start'` |

---

## 6. CSS GRID USAGE (third layout system, not documented as standard)

| File | Line | Pattern |
|------|------|---------|
| features/ai-models/ModelModals.tsx | 44, 50, 99, 105 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr'` |
| features/knowledge-base/EntryModals.tsx | 57, 84, 158 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr 1fr'` |
| features/members/InviteMemberModal.tsx | 67, 98 | `display: 'grid'` |
| features/members/ChangeRoleModal.tsx | 75, 82 | `display: 'grid'` |
| features/projects/ProjectDetailDrawer.tsx | 43 | `display: 'grid'` with `gridTemplateColumns: 'repeat(4, 1fr)'` |
| features/projects/ProjectFormModal.tsx | 71, 103 | `display: 'grid'` |
| features/projects/ProjectForm.tsx | 56, 105 | `display: 'grid'` on `<Form>` and inner div |
| features/repositories/RepositoryDetailDrawer.tsx | 107 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr'` |
| features/scan-policies/PolicyModals.tsx | 123, 178, 229 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr'` |
| features/scan/NewScanModal.tsx | 499, 621 | `display: 'grid'` |
| features/scan/ScanDetailDrawer.tsx | 108 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr'` |
| features/source-control/ConfigureModal.tsx | 117, 133, 142 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr'` |
| features/source-control/SourceControlModals.tsx | 30, 93 | `display: 'grid'` |
| features/teams/TeamDetailDrawer.tsx | 43 | `display: 'grid'` with `gridTemplateColumns: '1fr 1fr 1fr'` |
| features/teams/TeamFormModal.tsx | 55 | `display: 'grid'` |
| features/teams/TeamForm.tsx | 54 | `display: 'grid'` on `<Form>` |

**Count:** 31 instances of CSS Grid across 16 files. This is a significant pattern but completely undocumented.

---

## 7. `<Space>` COMPONENT USAGE (rare, inconsistent)

| File | Line | Usage |
|------|------|-------|
| features/projects/ProjectListCard.tsx | 44 | `<Space direction="vertical" size={0}>` |

Only 1 file uses `<Space>` at all. This is a minor inconsistency but notable.

---

## 8. HORIZONTAL RULE / FILTER BAR PATTERN INCONSISTENCY

Three files share an identical filter bar pattern but implement it differently:

| File | Line | Implementation |
|------|------|----------------|
| features/findings/FindingsTable.tsx | 224 | `<div style={{ borderBottom: ..., padding: 12 }}>` |
| features/projects/ProjectsTable.tsx | 95 | `<div style={{ borderBottom: ..., padding: 12 }}>` |
| features/members/InvitationsTable.tsx | 107 | `<div style={{ borderBottom: ..., padding: 12 }}>` |
| features/members/MembersTable.tsx | 100 | `<div style={{ borderBottom: ..., padding: 12 }}>` |

These are identical boilerplate that should be a shared component.

---

## SUMMARY OF INCONSISTENCIES

| Category | Count | Severity |
|----------|-------|----------|
| Raw `display: 'flex'` instead of `<Flex>` | 34+ instances across 17 files | HIGH |
| Mixed Row/Col + Flex in same file | 7 files | MEDIUM |
| Hardcoded numeric gap values (not using token) | 19+ instances | HIGH |
| String-based gap values mixed with numeric | 6 instances | MEDIUM |
| Hardcoded padding values (not using token) | 12+ instances | MEDIUM |
| Inline alignItems/justifyContent on divs | 14+ instances | HIGH |
| CSS Grid undocumented as layout system | 31 instances across 16 files | HIGH |
| Identical filter bar boilerplate not extracted | 4 files | LOW |
| Space component used once only | 1 file | LOW |

### Files with the MOST inconsistencies (highest concentration of mixed patterns):

1. **features/scan/NewScanModal.tsx** — raw flex, CSS grid, hardcoded gaps, inline alignment
2. **features/findings/FindingsTable.tsx** — Row/Col + Flex + inline flex + hardcoded gaps
3. **features/findings/FindingDetailDrawer.tsx** — Row/Col + Flex + raw flex + hardcoded values
4. **features/repositories/RepositoryDetailDrawer.tsx** — raw flex + CSS grid + hardcoded gaps/padding
5. **features/projects/ProjectDetailDrawer.tsx** — raw flex + Flex + CSS grid
6. **components/layout/app-shell.tsx** — 10+ raw flex instances, all hardcoded gaps
7. **features/members/ChangeRoleModal.tsx** — CSS grid + hardcoded gaps/padding/borderRadius

### Recommended standard:

Based on the AGENTS.md rule "Follow existing patterns," the `<Flex>` component with `token.*` references is the dominant and most consistent pattern (used in 43+ files). The recommended standard would be:

1. **Use `<Flex>`** for all flex layouts (never raw `display: 'flex'` on divs)
2. **Use `<Flex vertical>`** instead of `flexDirection: 'column'`
3. **Use `token.*`** for all gap/padding/margin values (never hardcoded numbers)
4. **Use `<Row>/<Col>`** ONLY for responsive column grids in table filter areas
5. **Extract CSS Grid** into a documented pattern or prefer `<Row>/<Col>` for 2-column layouts
6. **Extract the filter bar** pattern into a shared component

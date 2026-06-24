# Permission & Feature Gate Mapping — Per Page

**Generated:** 2026-06-24  
**Scope:** All authenticated pages, buttons, navigation items

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Permission/feature gate present |
| ❌ | Missing gate (should have one) |
| ⚠️ | Inconsistency or issue found |
| 🔒 | Permission gate |
| 🚩 | Feature flag gate |
| 👤 | Role-based check (isAtLeast) |

---

## 1. Dashboard

**File:** `src/app/(authenticated)/[workspace]/dashboard/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page access | None | — | ❌ No feature gate wrapper |
| Page content | None | — | ❌ No permission gate |

**Role Impact:** All roles (MEMBER+) can access. Consistent with `DASHBOARD_VIEW` being in all roles.

**Issue:** Page has no `FeatureGate` wrapper (other pages like Reports, Teams do). No `PermissionGate` either, though `DASHBOARD_VIEW` exists for all roles.

---

## 2. Repositories

**File:** `src/app/(authenticated)/[workspace]/repositories/page.tsx`  
**Components:** `src/features/repositories/RepositoriesTable.tsx`, `src/features/repositories/RepositoryDetailDrawer.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page access | None | — | ❌ No feature gate |
| Page content | None | — | ❌ No permission gate |
| "Run Scan" button (drawer) | 🔒 PermissionGate | `SCAN_RUN` | ✅ |
| Inline project edit (table) | 👤 usePermissions `has()` | Hardcoded `'repository:manage'` | ⚠️ **Uses string instead of PERMISSION constant** |
| View History button (drawer) | None | — | ❌ Should be `REPOSITORY_VIEW` |

**Role Impact:**
- MEMBER: Can view, cannot run scan or manage
- REVIEWER+: Can run scan (`SCAN_RUN`)
- MANAGER+: Can manage repositories (`REPOSITORY_MANAGE`)

**Issues:**
1. ⚠️ `RepositoriesTable.tsx` uses hardcoded `'repository:manage'` string instead of `PERMISSION.REPOSITORY_MANAGE`
2. ❌ View History button in drawer has no gate

---

## 3. Scans

**File:** `src/app/(authenticated)/[workspace]/scan/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page content (outer) | 🔒 PermissionGate | `SCAN_VIEW` | ✅ |
| "Run Scan" button (manual) | 🔒 PermissionGate | `SCAN_RUN` | ✅ |
| "Retry" button (failed scan) | 🔒 PermissionGate | `SCAN_RUN` | ✅ |
| Scan table rows | None | — | ❌ Individual scan rows not gated |

**Role Impact:**
- MEMBER: Can view scans (SCAN_VIEW)
- REVIEWER+: Can run/retry scans (SCAN_RUN)

---

## 4. Findings

**File:** `src/app/(authenticated)/[workspace]/findings/page.tsx`  
**Components:** `src/features/findings/FindingsPage.tsx`, `src/features/findings/FindingsTable.tsx`, `src/features/findings/FindingActions.tsx`, `src/features/scan/FindingItem.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| "Override AI" button (page) | 🔒 PermissionGate | `FINDING_OVERRIDE_AI` | ✅ |
| "Dismiss" button (bulk) | 🔒 PermissionGate | `FINDING_TRIAGE` | ✅ |
| "Re-verify" button (bulk) | 🔒 PermissionGate | `SCAN_RUN` | ✅ |
| "Assign" button (bulk) | 🔒 PermissionGate | `FINDING_TRIAGE` | ✅ |
| "Dismiss" button (individual) | 🔒 PermissionGate | `FINDING_TRIAGE` | ✅ |
| "Mark Resolved" button (individual) | 🔒 PermissionGate | `FINDING_TRIAGE` | ✅ |
| Finding detail drawer | None | — | ❌ No page-level gate |

**Role Impact:**
- MEMBER: Can view findings (FINDING_VIEW)
- REVIEWER+: Can triage and override AI (FINDING_TRIAGE, FINDING_OVERRIDE_AI)

---

## 5. Reports

**File:** `src/app/(authenticated)/[workspace]/reports/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `REPORTS` | ✅ |
| Page content | 👤 usePermissions `has()` | Checks permission for data | ✅ |
| "Export PDF" button | 🔒 PermissionGate | `REPORT_EXPORT` | ✅ |
| "Export XLSX" button | None | — | ❌ Should also be gated |

**Role Impact:**
- MEMBER: Can view reports (REPORT_VIEW)
- REVIEWER+: Can export reports (REPORT_EXPORT)

**Issue:** Only PDF export is gated; XLSX export appears ungated.

---

## 6. Arena

**File:** `src/app/(authenticated)/[workspace]/arena/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `ARENA` | ✅ |
| Page content | None | — | ❌ No permission gate |
| Create/edit buttons | None | — | ❌ Should be `ARENA_MANAGE` |

**Role Impact:**
- MEMBER: No access (ARENA_MANAGE not in MEMBER/REVIEWER)
- MANAGER+: Can manage arena (ARENA_MANAGE)

**Issue:** Page content has no permission gate; all authenticated users who see the page can interact.

---

## 7. Members

**File:** `src/app/(authenticated)/[workspace]/members/page.tsx`  
**Components:** `src/features/members/MembersTable.tsx`, `src/features/members/InvitationsTable.tsx`, `src/features/members/MemberSummaryCards.tsx`, `src/features/members/InviteMemberModal.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page content | 🔒 PermissionGate | `MEMBER_VIEW` | ✅ |
| "Invite" button | 🔒 PermissionGate | `MEMBER_INVITE` | ✅ |
| "Remove" action (table) | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| "Edit Role" action (table) | 👤 usePermissions `isAtLeast('owner')` | Role check | ✅ |
| "Revoke" action (invitations) | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| Role display card | 👤 usePermissions `role` | Read-only display | ✅ |
| Invite modal | None (gate at page level) | — | ✅ Correct — page-level gate |

**Role Impact:**
- MEMBER: Can view members (MEMBER_VIEW)
- REVIEWER: Same as MEMBER
- MANAGER: Can invite and remove members
- OWNER: Can also change roles

**Status:** Well-gated across all elements.

---

## 8. Teams

**File:** `src/app/(authenticated)/[workspace]/teams/page.tsx`  
**Components:** `src/features/teams/TeamsTable.tsx`, `src/features/teams/TeamsPageHeader.tsx`, `src/features/teams/TeamDetailDrawer.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `TEAMS` | ✅ |
| "New team" button | 🔒 PermissionGate | `TEAM_MANAGE` | ✅ |
| Edit action (table row) | 👤 usePermissions `has()` | `TEAM_MANAGE` | ✅ |
| Edit button (drawer) | 🔒 PermissionGate | `TEAM_MANAGE` | ✅ |
| Delete button (drawer) | 🔒 PermissionGate | `TEAM_MANAGE` | ✅ |
| Team list content | None | — | ❌ No `TEAM_VIEW` gate |

**Role Impact:**
- MEMBER: Can view teams (TEAM_VIEW) but page has no view gate
- MANAGER+: Can manage teams (TEAM_MANAGE)

**Issue:** Team list content has no `TEAM_VIEW` permission gate. All users can see team data if feature flag is on.

---

## 9. Projects

**File:** `src/app/(authenticated)/[workspace]/projects/page.tsx`  
**Components:** `src/features/projects/ProjectsPageHeader.tsx`, `src/features/projects/ProjectDetailDrawer.tsx`, `src/features/projects/ProjectDetailPage.tsx`, `src/features/projects/ProjectApiTokens.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `PROJECTS` | ✅ |
| "New project" button | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| Edit project (drawer) | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| Delete project (drawer) | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| Edit/Save (detail page) | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| Delete project (detail page) | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| API tokens section | 🔒 PermissionGate | `PROJECT_MANAGE` | ✅ |
| Create token button | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| Revoke token | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| Project list content | None | — | ❌ No `PROJECT_VIEW` gate |

**Role Impact:**
- MEMBER: Can view projects (PROJECT_VIEW) but no view gate on list
- MANAGER+: Can manage projects (PROJECT_MANAGE)

**Issue:** Same as Teams — project list has no view gate.

---

## 10. Schedules

**File:** `src/app/(authenticated)/[workspace]/schedules/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `SCHEDULES` | ✅ |
| Page content | 👤 usePermissions `has()` | Permission check | ✅ |
| "New schedule" button | 🔒 PermissionGate | `SCHEDULE_MANAGE` | ✅ |
| Schedule table rows | None | — | ❌ No per-row gate |

**Role Impact:**
- MEMBER: Cannot see schedules (SCHEDULE_MANAGE not in MEMBER)
- MANAGER+: Can manage schedules

---

## 11. Source Control

**File:** `src/app/(authenticated)/[workspace]/source-control/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page content | 👤 usePermissions `has()` | Permission check | ✅ |
| Connect provider button | 🔒 PermissionGate | `INTEGRATION_MANAGE` | ✅ |
| Provider cards | None | — | ❌ No per-card gate |
| "Sync" button | None | — | ❌ Should be `INTEGRATION_MANAGE` |

**Role Impact:**
- MEMBER: Can view integrations (INTEGRATION_VIEW)
- MANAGER+: Can manage integrations (INTEGRATION_MANAGE)

---

## 12. Webhooks

**File:** `src/app/(authenticated)/[workspace]/webhooks/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `WEBHOOKS` | ✅ |
| Page content | None | — | ❌ No permission gate |
| Create/edit buttons | None | — | ❌ Should be `WEBHOOK_MANAGE` |

**Role Impact:**
- MEMBER: No access (WEBHOOK_MANAGE not in MEMBER)
- MANAGER+: Can manage webhooks

**Issue:** No permission gate on page content. All users who see the page can interact.

---

## 13. Knowledge Base

**File:** `src/app/(authenticated)/[workspace]/knowledge-base/page.tsx`  
**Components:** `src/features/knowledge-base/EntryModals.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `KNOWLEDGE_BASE` | ✅ |
| Page content | 👤 usePermissions `has()` | `KNOWLEDGE_READ` | ✅ |
| Edit entry button | 🔒 PermissionGate | `KNOWLEDGE_MANAGE` | ✅ |
| Mute/Unmute button | 🔒 PermissionGate | `KNOWLEDGE_MANAGE` | ✅ |
| Create source button | None | — | ❌ Should be `KNOWLEDGE_MANAGE` |

**Role Impact:**
- MEMBER: Can view knowledge base (KNOWLEDGE_READ)
- MANAGER+: Can manage knowledge base (KNOWLEDGE_MANAGE)

**Issue:** ⚠️ Uses `KNOWLEDGE_READ` — inconsistent naming (should be `KNOWLEDGE_VIEW`).

---

## 14. AI Models

**File:** `src/app/(authenticated)/[workspace]/ai-models/page.tsx`  
**Components:** `src/features/model/VerificationSettingsCard.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `AI_MODELS` | ✅ |
| Page content | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| "Save" button | 🔒 PermissionGate | `AI_MODEL_MANAGE` | ✅ |
| "Test" button | 🔒 PermissionGate | `AI_MODEL_MANAGE` | ✅ |
| Verification settings | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |

**Role Impact:**
- MEMBER: Cannot access (no AI_MODEL_VIEW gate, but feature gate hides page)
- REVIEWER: Cannot access
- MANAGER+: Can view, can manage if has AI_MODEL_MANAGE

**Issue:** Page uses role check (`isAtLeast('manager')`) instead of permission check. Inconsistent with other pages.

---

## 15. Scanner Engines

**File:** `src/app/(authenticated)/[workspace]/scanner-engines/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `SCANNER_ENGINES` | ✅ |
| "Add engine" button | 🔒 PermissionGate | `SCANNER_MANAGE` | ✅ |
| Engine table rows | None | — | ❌ No per-row gate |

**Role Impact:**
- MEMBER: Cannot access (SCANNER_MANAGE not in MEMBER)
- MANAGER+: Can manage scanners

---

## 16. Quality Gates

**File:** `src/app/(authenticated)/[workspace]/quality-gates/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page wrapper | 🚩 FeatureGate | `QUALITY_GATES` | ✅ |
| Page content | 👤 usePermissions `isAtLeast('manager')` | Role check | ✅ |
| "Edit" button | 🔒 PermissionGate | `POLICY_MANAGE` | ✅ |

**Role Impact:**
- MEMBER: Cannot access
- MANAGER+: Can view and manage policies

---

## 17. Workspace Settings

**File:** `src/app/(authenticated)/[workspace]/settings/page.tsx`  
**Components:** `src/features/workspace/WorkspaceGeneralSettings.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page access | None | — | ❌ No feature gate or permission gate |
| "Save changes" button | 🔒 PermissionGate | `WORKSPACE_SETTINGS` | ✅ |
| Settings form | None | — | ❌ No view gate |

**Role Impact:**
- MEMBER: Can view settings (WORKSPACE_SETTINGS_VIEW) but no gate on form
- OWNER: Can edit settings (WORKSPACE_SETTINGS)

**Issue:** Settings page has no feature gate wrapper (inconsistent with other configure pages).

---

## 18. Profile

**File:** `src/app/(authenticated)/[workspace]/profile/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page access | None | — | ❌ No gate |
| Profile form | None | — | ❌ No gate |

**Role Impact:** All roles can access. Acceptable — profile is user-specific.

---

## 19. Settings (Workspace Admin)

**File:** `src/app/(authenticated)/[workspace]/settings/page.tsx`

| Element | Gate Type | Permission/Flag | Status |
|---------|-----------|-----------------|--------|
| Page access | None | — | ❌ No gate |
| Settings form | None | — | ❌ No gate |

**Role Impact:** All roles can see settings. Only OWNER can save (gated by `WORKSPACE_SETTINGS`).

---

## Navigation Sidebar (AppShell)

**File:** `src/commons/components/layout/AppShell.tsx`

| Nav Item | Gate Type | Condition | Status |
|----------|-----------|-----------|--------|
| Dashboard | None | Always shown | ✅ |
| Repositories | None | Always shown | ✅ |
| Scans | None | Always shown | ✅ |
| Findings | None | Always shown | ✅ |
| Reports | 🚩 FeatureFlag | `REPORTS` | ✅ |
| Arena | 🚩 FeatureFlag | `ARENA` | ✅ |
| Members | None | Always shown | ✅ |
| Teams | 🚩 FeatureFlag | `TEAMS` | ✅ |
| Projects | 🚩 FeatureFlag | `PROJECTS` | ✅ |
| Schedules | 🚩 FeatureFlag | `SCHEDULES` | ✅ |
| Profile | None | Always shown | ✅ |
| Source Control | 🚩 FeatureFlag | `GITHUB \|\| GITLAB \|\| GITEA` | ✅ |
| Webhooks | 🚩 FeatureFlag | `WEBHOOKS` | ✅ |
| Scanner Engines | 🚩 FeatureFlag | `SCANNER_ENGINES` | ✅ |
| AI Models | 🚩 FeatureFlag | `AI_MODELS` | ✅ |
| Quality Gates | 🚩 FeatureFlag | `QUALITY_GATES` | ✅ |
| Knowledge Base | 🚩 FeatureFlag | `KNOWLEDGE_BASE` | ✅ |
| Workspace Settings | None | Always shown | ✅ |

**Issue:** Sidebar uses feature flags but **no permission-based hiding**. A MEMBER sees "Members", "Teams", "Projects" in sidebar even though they can't manage them. Only the buttons inside are gated.

---

## Summary: Gaps Found

### Missing Feature Gate Wrappers (page-level)
| Page | Expected Flag | Status |
|------|--------------|--------|
| Dashboard | — | ❌ No gate (acceptable — all roles) |
| Repositories | — | ❌ No gate |
| Findings | — | ❌ No gate |
| Members | — | ❌ No gate |
| Profile | — | ❌ No gate (acceptable) |
| Workspace Settings | — | ❌ No gate |

### Missing Permission Gates (button/action-level)
| Page | Element | Expected Permission | Status |
|------|---------|-------------------|--------|
| Repositories | View History button | `REPOSITORY_VIEW` | ❌ |
| Reports | XLSX export | `REPORT_EXPORT` | ❌ |
| Arena | Create/edit buttons | `ARENA_MANAGE` | ❌ |
| Teams | Team list content | `TEAM_VIEW` | ❌ |
| Projects | Project list content | `PROJECT_VIEW` | ❌ |
| Webhooks | Create/edit buttons | `WEBHOOK_MANAGE` | ❌ |
| Knowledge Base | Create source button | `KNOWLEDGE_MANAGE` | ❌ |
| Source Control | Provider cards, Sync | `INTEGRATION_VIEW`/`MANAGE` | ❌ |

### Naming Inconsistencies
| Constant | Current | Should Be | Files Affected |
|----------|---------|-----------|----------------|
| `KNOWLEDGE_READ` | `_READ` | `_VIEW` | permissions.ts, knowledge-base/page.tsx, 4 API routes |
| `AUDIT_READ` | `_READ` | `_VIEW` | permissions.ts, activity-logs/route.ts, audit-logs/route.ts |
| `RepositoriesTable` | Hardcoded `'repository:manage'` | `PERMISSION.REPOSITORY_MANAGE` | RepositoriesTable.tsx |

### Missing Hook Helper
| Helper | Status |
|--------|--------|
| `has()` | ✅ Implemented |
| `hasAll()` | ✅ Implemented |
| `hasAny()` | ✅ Implemented |
| `isAtLeast()` | ✅ Implemented |
| `notHas()` | ❌ Missing — needed for negative permission checks |

---

## Role Permission Matrix

| Permission | OWNER | MANAGER | REVIEWER | MEMBER |
|------------|-------|---------|----------|--------|
| DASHBOARD_VIEW | ✅ | ✅ | ✅ | ✅ |
| REPOSITORY_VIEW | ✅ | ✅ | ✅ | ✅ |
| REPOSITORY_MANAGE | ✅ | ✅ | ❌ | ❌ |
| SCAN_VIEW | ✅ | ✅ | ✅ | ✅ |
| SCAN_RUN | ✅ | ✅ | ✅ | ❌ |
| FINDING_VIEW | ✅ | ✅ | ✅ | ✅ |
| FINDING_TRIAGE | ✅ | ✅ | ✅ | ❌ |
| FINDING_OVERRIDE_AI | ✅ | ✅ | ✅ | ❌ |
| REPORT_VIEW | ✅ | ✅ | ✅ | ✅ |
| REPORT_EXPORT | ✅ | ✅ | ✅ | ❌ |
| ARENA_MANAGE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_VIEW | ✅ | ✅ | ✅ | ✅ |
| MEMBER_INVITE | ✅ | ✅ | ❌ | ❌ |
| MEMBER_MANAGE | ✅ | ✅ | ❌ | ❌ |
| TEAM_VIEW | ✅ | ✅ | ✅ | ✅ |
| TEAM_MANAGE | ✅ | ✅ | ❌ | ❌ |
| PROJECT_VIEW | ✅ | ✅ | ✅ | ✅ |
| PROJECT_MANAGE | ✅ | ✅ | ❌ | ❌ |
| INTEGRATION_VIEW | ✅ | ✅ | ✅ | ❌ |
| INTEGRATION_MANAGE | ✅ | ✅ | ❌ | ❌ |
| WEBHOOK_MANAGE | ✅ | ✅ | ❌ | ❌ |
| SCHEDULE_MANAGE | ✅ | ✅ | ❌ | ❌ |
| POLICY_VIEW | ✅ | ✅ | ✅ | ❌ |
| POLICY_MANAGE | ✅ | ✅ | ❌ | ❌ |
| SCANNER_MANAGE | ✅ | ✅ | ❌ | ❌ |
| AI_MODEL_VIEW | ✅ | ✅ | ✅ | ❌ |
| AI_MODEL_MANAGE | ✅ | ✅ | ❌ | ❌ |
| KNOWLEDGE_READ ⚠️ | ✅ | ✅ | ✅ | ✅ |
| KNOWLEDGE_MANAGE | ✅ | ✅ | ❌ | ❌ |
| WORKSPACE_SETTINGS | ✅ | ❌ | ❌ | ❌ |
| WORKSPACE_SETTINGS_VIEW | ✅ | ✅ | ✅ | ✅ |
| AUDIT_READ ⚠️ | ✅ | ✅ | ❌ | ❌ |

⚠️ = Naming inconsistency (should be `_VIEW`)

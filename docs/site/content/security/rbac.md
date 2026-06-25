# Role-Based Access Control (RBAC)

## Overview

SAST Integration implements granular RBAC with 4 roles and 37 permissions.

## Role Hierarchy

```
owner (4) > manager (3) > reviewer (2) > member (1)
```

## Roles

| Role | Level | Description |
|------|-------|-------------|
| owner | 4 | Full access, manage billing, delete workspace |
| manager | 3 | Most access, invite members, manage settings |
| reviewer | 2 | Run scans, triage findings, export reports |
| member | 1 | View-only access across all resources |

## Permission Matrix

| Permission | owner | manager | reviewer | member |
|------------|:-----:|:-------:|:--------:|:------:|
| DASHBOARD_VIEW | X | X | X | X |
| REPOSITORY_VIEW | X | X | X | X |
| REPOSITORY_MANAGE | X | X | - | - |
| SCAN_VIEW | X | X | X | X |
| SCAN_RUN | X | X | X | - |
| FINDING_VIEW | X | X | X | X |
| FINDING_TRIAGE | X | X | X | - |
| FINDING_OVERRIDE_AI | X | X | X | - |
| REPORT_VIEW | X | X | X | X |
| REPORT_EXPORT | X | X | X | - |
| MEMBER_VIEW | X | X | X | X |
| MEMBER_INVITE | X | X | - | - |
| MEMBER_MANAGE | X | X | - | - |
| TEAM_VIEW | X | X | X | X |
| TEAM_MANAGE | X | X | - | - |
| PROJECT_VIEW | X | X | X | X |
| PROJECT_MANAGE | X | X | - | - |
| WORKSPACE_SETTINGS_VIEW | X | X | X | X |
| WORKSPACE_SETTINGS_MANAGE | X | X | - | - |
| AUDIT_VIEW | X | X | X | - |

## Permission Format

```
resource:action
```

### Resources (18)

dashboard, repository, scan, finding, report, arena, member, team, project, integration, webhook, schedule, policy, scanner, ai_model, knowledge, workspace, audit

### Actions (9)

view, manage, run, triage, override_ai, export, invite, settings, read

## Component Guards

### PermissionGate (UI)

```tsx
<PermissionGate permission={PERMISSION.SCAN_RUN} fallback={<PermissionHint />}>
  <Button>Run Scan</Button>
</PermissionGate>
```

### requirePermission (API)

```typescript
const result = await requirePermission(
  withWorkspaceId(request, workspaceId),
  auth.context,
  PERMISSION.SCAN_RUN
);
if (!result.success) return result.response;
```

## Role Summary

| Role | Total | View Only | View + Manage | Special |
|------|-------|-----------|---------------|---------|
| owner | 35 | - | all | everything |
| manager | 35 | - | most | +MEMBER_INVITE |
| reviewer | 21 | 14 | 7 | +SCAN_RUN, +FINDING_TRIAGE, +FINDING_OVERRIDE_AI, +REPORT_EXPORT |
| member | 16 | 16 | - | view-only across all resources |

# Workspace Permissions

## Overview

Permissions are workspace-scoped. Each workspace member has a role that determines their access level.

## Permission Architecture

```
URL → AuthenticatedShell → Session check → Workspace check
  ↓ (pass)                              ↓ (fail)
AppShell                         /auth/signin or /workspaces
```

## Page Guards

Every page uses layered guards:

```
FeatureGate (feature flag) → PermissionGate (VIEW) → PageContent → PermissionGate (MANAGE)
```

## Non-Feature-Flagged Pages

| Page | Route | Top-Level Gate | Inline Gate |
|------|-------|---------------|-------------|
| Dashboard | `/{slug}` | - | - |
| Repositories | `/{slug}/repositories` | - | - |
| Scan | `/{slug}/scan` | `SCAN_VIEW` | `SCAN_RUN` |
| Findings | `/{slug}/findings` | `FINDING_VIEW` | `FINDING_OVERRIDE_AI` |
| Members | `/{slug}/members` | `MEMBER_VIEW` | `MEMBER_INVITE` |
| Settings | `/{slug}/settings` | - | `WORKSPACE_SETTINGS_MANAGE` |

## Feature-Flagged Pages

| Page | Feature Gate | Top-Level Gate | Inline Gate |
|------|-------------|---------------|-------------|
| Teams | `TEAMS` | `TEAM_VIEW` | `TEAM_MANAGE` |
| Projects | `PROJECTS` | `PROJECT_VIEW` | `PROJECT_MANAGE` |
| Reports | `REPORTS` | `REPORT_VIEW` | `REPORT_EXPORT` |
| Source Control | `any SCM` | `INTEGRATION_VIEW` | `INTEGRATION_MANAGE` |
| Scanner Engines | `SCANNER_ENGINES` | `SCANNER_VIEW` | `SCANNER_MANAGE` |
| AI Models | `AI_MODELS` | `AI_MODEL_VIEW` | `AI_MODEL_MANAGE` |
| Quality Gates | `QUALITY_GATES` | `POLICY_VIEW` | `POLICY_MANAGE` |
| Knowledge Base | `KNOWLEDGE_BASE` | `KNOWLEDGE_VIEW` | `KNOWLEDGE_MANAGE` |

## Sidebar Navigation

| Section | Items |
|---------|-------|
| Navigate | Dashboard, Repositories, Scans, Findings, Reports, Arena |
| Manage | Members, Teams, Projects, Schedules |
| Configure | Profile, Source Control, Webhooks, Scanner Engines, AI Models, Quality Gates, Knowledge Base, Settings |

## API Route Permissions

Every API route enforces permission checks:

```typescript
// GET — view permission
await requirePermission(req, auth, PERMISSION.TEAM_VIEW);

// POST/PUT/DELETE — manage permission
await requirePermission(req, auth, PERMISSION.TEAM_MANAGE);
```

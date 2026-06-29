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
| Findings | `/{slug}/findings` | `FINDING_VIEW` | `FINDING_TRIAGE`, `FINDING_OVERRIDE_AI` |
| Members | `/{slug}/members` | `MEMBER_VIEW` | `MEMBER_INVITE`, `MEMBER_MANAGE` |
| Settings | `/{slug}/settings` | `WORKSPACE_SETTINGS_VIEW` | `WORKSPACE_SETTINGS_MANAGE` |

## Feature-Flagged Pages

| Page | Feature Gate | Top-Level Gate | Inline Gate |
|------|-------------|---------------|-------------|
| Teams | `TEAMS` | `TEAM_VIEW` | `TEAM_MANAGE` |
| Projects | `PROJECTS` | `PROJECT_VIEW` | `PROJECT_MANAGE` |
| Reports | `REPORTS` | `REPORT_VIEW` | `REPORT_EXPORT` |
| Webhooks | `WEBHOOKS` | `WEBHOOK_VIEW` | `WEBHOOK_MANAGE` |
| Schedules | `SCHEDULES` | `SCHEDULE_VIEW` | `SCHEDULE_MANAGE` |
| Source Control | `any SCM` | `INTEGRATION_VIEW` | `INTEGRATION_MANAGE` |
| Scanner Engines | `SCANNER_ENGINES` | `SCANNER_VIEW` | `SCANNER_MANAGE` |
| AI Models | `AI_MODELS` | `AI_MODEL_VIEW` | `AI_MODEL_MANAGE` |
| Quality Gates | `QUALITY_GATES` | `QUALITY_GATE_VIEW` | `QUALITY_GATE_MANAGE` |
| Knowledge Base | `KNOWLEDGE_BASE` | `KNOWLEDGE_VIEW` | `KNOWLEDGE_MANAGE` |

## Sidebar Navigation

Every nav item is gated by `FeatureFlag && has(PERMISSION.XXX)`:

| Section | Items | Filter |
|---------|-------|--------|
| Navigate | Dashboard, Repositories, Scans, Findings | — |
| Navigate | Reports | `REPORTS` flag + `REPORT_VIEW` |
| Manage | Members | `MEMBER_VIEW` |
| Manage | Teams | `TEAMS` flag + `TEAM_VIEW` |
| Manage | Projects | `PROJECTS` flag + `PROJECT_VIEW` |
| Manage | Schedules | `SCHEDULES` flag + `SCHEDULE_VIEW` |
| Configure | Profile | — |
| Configure | Source Control | `SCM` flag + `INTEGRATION_VIEW` |
| Configure | Webhooks | `WEBHOOKS` flag + `WEBHOOK_VIEW` |
| Configure | Scanner Engines | `SCANNER_ENGINES` flag + `SCANNER_VIEW` |
| Configure | AI Models | `AI_MODELS` flag + `AI_MODEL_VIEW` |
| Configure | Quality Gates | `QUALITY_GATES` flag + `QUALITY_GATE_VIEW` |
| Configure | Knowledge Base | `KNOWLEDGE_BASE` flag + `KNOWLEDGE_VIEW` |
| Configure | Settings | `WORKSPACE_SETTINGS_VIEW` |

## API Route Permissions

Every API route enforces permission checks:

```typescript
// GET — view permission
await requirePermission(req, auth, PERMISSION.TEAM_VIEW);

// POST/PUT/DELETE — manage permission
await requirePermission(req, auth, PERMISSION.TEAM_MANAGE);
```

## Service Layer (Defense-in-Depth)

Services use `assertHasPermission()` as a second guard:

```typescript
import { assertHasPermission } from '@/server/http/authorization';
import { PERMISSION } from '@/commons/constants/permissions';

const role = await workspaceRepository.getMemberRole(workspaceId, userId);
assertHasPermission(role, PERMISSION.PROJECT_MANAGE, PROJECT.ERROR_CODE);
```

## Permission Matrix

| Resource | Permission | Owner | Manager | Reviewer | Member |
|----------|-----------|-------|---------|----------|--------|
| `dashboard` | `dashboard:view` | ✅ | ✅ | ✅ | ✅ |
| `repository` | `repository:view` | ✅ | ✅ | ✅ | ✅ |
| `repository` | `repository:manage` | ✅ | ✅ | — | — |
| `scan` | `scan:view` | ✅ | ✅ | ✅ | ✅ |
| `scan` | `scan:run` | ✅ | ✅ | ✅ | — |
| `scan` | `scan:upload` | ✅ | ✅ | ✅ | — |
| `finding` | `finding:view` | ✅ | ✅ | ✅ | ✅ |
| `finding` | `finding:triage` | ✅ | ✅ | ✅ | — |
| `finding` | `finding:override_ai` | ✅ | ✅ | ✅ | — |
| `report` | `report:view` | ✅ | ✅ | ✅ | ✅ |
| `report` | `report:export` | ✅ | ✅ | ✅ | — |
| `arena` | `arena:view` | ✅ | ✅ | ✅ | ✅ |
| `arena` | `arena:manage` | ✅ | ✅ | — | — |
| `member` | `member:view` | ✅ | ✅ | ✅ | ✅ |
| `member` | `member:invite` | ✅ | ✅ | — | — |
| `member` | `member:manage` | ✅ | ✅ | — | — |
| `team` | `team:view` | ✅ | ✅ | ✅ | ✅ |
| `team` | `team:manage` | ✅ | ✅ | — | — |
| `project` | `project:view` | ✅ | ✅ | ✅ | ✅ |
| `project` | `project:manage` | ✅ | ✅ | — | — |
| `integration` | `integration:view` | ✅ | ✅ | ✅ | ✅ |
| `integration` | `integration:manage` | ✅ | ✅ | — | — |
| `webhook` | `webhook:view` | ✅ | ✅ | ✅ | ✅ |
| `webhook` | `webhook:manage` | ✅ | ✅ | — | — |
| `schedule` | `schedule:view` | ✅ | ✅ | ✅ | ✅ |
| `schedule` | `schedule:manage` | ✅ | ✅ | — | — |
| `policy` | `policy:view` | ✅ | ✅ | ✅ | — |
| `policy` | `policy:manage` | ✅ | ✅ | — | — |
| `quality_gate` | `quality_gate:view` | ✅ | ✅ | ✅ | ✅ |
| `quality_gate` | `quality_gate:manage` | ✅ | ✅ | — | — |
| `scanner` | `scanner:view` | ✅ | ✅ | ✅ | ✅ |
| `scanner` | `scanner:manage` | ✅ | ✅ | — | — |
| `ai_model` | `ai_model:view` | ✅ | ✅ | ✅ | ✅ |
| `ai_model` | `ai_model:manage` | ✅ | ✅ | — | — |
| `knowledge` | `knowledge:view` | ✅ | ✅ | ✅ | ✅ |
| `knowledge` | `knowledge:manage` | ✅ | ✅ | — | — |
| `workspace` | `workspace:view` | ✅ | ✅ | ✅ | ✅ |
| `workspace` | `workspace:settings` | ✅ | ✅ | — | — |
| `audit` | `audit:read` | ✅ | ✅ | ✅ | ✅ |

## Function Parameter Convention

All service/repository functions follow **`workspaceId` first** parameter order:

```typescript
// Service layer
async function(workspaceId: string, id: string, ...params, userId: string)

// Repository layer (when workspaceId is applicable)
async function(workspaceId: string, id: string, ...params)
```

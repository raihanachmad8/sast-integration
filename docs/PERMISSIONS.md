# Permissions & Feature Flags

> Single source of truth for the permission system, feature flag mapping, and navigation guards.

**Source files:**
- `src/commons/constants/permissions.ts` — All permissions, roles, role→permission mapping
- `src/commons/constants/feature-flags.ts` — All feature flags, env var mapping, defaults
- `.env.example` — All env vars (server + `NEXT_PUBLIC_`)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Permission System](#permission-system)
3. [Roles](#roles)
4. [Feature Flags](#feature-flags)
5. [Env Variables](#env-variables)
6. [Page Guards — Complete Reference](#page-guards--complete-reference)
7. [API Route Permissions — Complete Reference](#api-route-permissions--complete-reference)
8. [Sidebar Navigation](#sidebar-navigation)
9. [Topbar Navigation](#topbar-navigation)
10. [Auth Flow](#auth-flow)
11. [Component Reference](#component-reference)
12. [Adding a New Feature](#adding-a-new-feature)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Auth Flow                                   │
│  URL → AuthenticatedShell → Session check → Workspace check         │
│       ↓ (pass)         ↓ (fail)                                    │
│     AppShell         /auth/signin or /workspaces                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         AppShell                                    │
│  ┌──────────────┬──────────────────────────────────────────────────┐│
│  │  SidebarNav  │  Topbar (WorkspaceSwitcher)                      ││
│  │  (260px)     │  ┌────────────────────────────────────────────┐  ││
│  │              │  │ Feature Flags: 17 flags checked             │  ││
│  │  Nav Items:  │  │ Permissions: MEMBER_VIEW for Members nav    │  ││
│  │  - always    │  └────────────────────────────────────────────┘  ││
│  │  - flag      │                                                  ││
│  │  - perm      ├──────────────────────────────────────────────────┤│
│  │              │  Page Content                                     ││
│  │              │  ┌────────────────────────────────────────────┐  ││
│  │              │  │ FeatureGate (if feature-flagged)            │  ││
│  │              │  │   └─ PermissionGate VIEW (top-level)        │  ││
│  │              │  │       └─ PageContent                        │  ││
│  │              │  │           └─ PermissionGate MANAGE (inline) │  ││
│  │              │  └────────────────────────────────────────────┘  ││
│  └──────────────┴──────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Permission System

### Format

```
resource:action
```

### Resources (18)

| Resource | Key |
|----------|-----|
| Dashboard | `dashboard` |
| Repository | `repository` |
| Scan | `scan` |
| Finding | `finding` |
| Report | `report` |
| Arena | `arena` |
| Member | `member` |
| Team | `team` |
| Project | `project` |
| Integration | `integration` |
| Webhook | `webhook` |
| Schedule | `schedule` |
| Policy | `policy` |
| Scanner | `scanner` |
| AI Model | `ai_model` |
| Knowledge | `knowledge` |
| Workspace | `workspace` |
| Audit | `audit` |

### Actions (9)

| Action | Key |
|--------|-----|
| View | `view` |
| Manage | `manage` |
| Run | `run` |
| Triage | `triage` |
| Override AI | `override_ai` |
| Export | `export` |
| Invite | `invite` |
| Settings | `settings` |
| Read | `read` |

### All Permissions (35)

| Permission | Value | Description |
|------------|-------|-------------|
| `DASHBOARD_VIEW` | `dashboard:view` | View dashboard and analytics |
| `REPOSITORY_VIEW` | `repository:view` | View repositories and sync status |
| `REPOSITORY_MANAGE` | `repository:manage` | Import, configure, and remove repositories |
| `SCAN_VIEW` | `scan:view` | View scan results and execution history |
| `SCAN_RUN` | `scan:run` | Trigger manual scans and manage scan queue |
| `FINDING_VIEW` | `finding:view` | Read-only access to findings and AI verdicts |
| `FINDING_TRIAGE` | `finding:triage` | Accept, dismiss, or change finding status |
| `FINDING_OVERRIDE_AI` | `finding:override_ai` | Manually override AI-assigned TP/FP verdicts |
| `REPORT_VIEW` | `report:view` | View generated reports |
| `REPORT_EXPORT` | `report:export` | Generate and download PDF/XLSX security reports |
| `ARENA_VIEW` | `arena:view` | View AI comparison runs |
| `ARENA_MANAGE` | `arena:manage` | Create and review AI comparison runs |
| `MEMBER_VIEW` | `member:view` | View workspace members and their roles |
| `MEMBER_INVITE` | `member:invite` | Send workspace invitations to new users |
| `MEMBER_MANAGE` | `member:manage` | Change roles, revoke access, manage invitations |
| `TEAM_VIEW` | `team:view` | View teams and team members |
| `TEAM_MANAGE` | `team:manage` | Create, edit, and delete teams |
| `PROJECT_VIEW` | `project:view` | View projects and their details |
| `PROJECT_MANAGE` | `project:manage` | Create, edit, delete projects. Attach repos and teams |
| `INTEGRATION_VIEW` | `integration:view` | View source control provider connections and status |
| `INTEGRATION_MANAGE` | `integration:manage` | Connect/disconnect SCM providers |
| `WEBHOOK_VIEW` | `webhook:view` | View webhook configuration and delivery history |
| `WEBHOOK_MANAGE` | `webhook:manage` | Create, edit, and delete outgoing webhooks |
| `SCHEDULE_VIEW` | `schedule:view` | View recurring scan schedules |
| `SCHEDULE_MANAGE` | `schedule:manage` | Create and manage recurring scan schedules |
| `POLICY_VIEW` | `policy:view` | View quality gate and scan policy configuration |
| `POLICY_MANAGE` | `policy:manage` | Edit scan policies and quality gates |
| `SCANNER_VIEW` | `scanner:view` | View scanner engines and their status |
| `SCANNER_MANAGE` | `scanner:manage` | Configure scanner engines and rules |
| `AI_MODEL_VIEW` | `ai_model:view` | View AI model configuration and status |
| `AI_MODEL_MANAGE` | `ai_model:manage` | Configure AI model chain and prompt presets |
| `KNOWLEDGE_VIEW` | `knowledge:read` | View knowledge base sources and entries |
| `KNOWLEDGE_MANAGE` | `knowledge:manage` | Manage knowledge base sources and entries |
| `WORKSPACE_SETTINGS_VIEW` | `workspace:view` | View workspace settings and configuration |
| `WORKSPACE_SETTINGS_MANAGE` | `workspace:settings` | Edit workspace name, billing, and global config |
| `AUDIT_VIEW` | `audit:read` | View audit logs and activity history |

---

## Roles

### Hierarchy

```
owner (4) > manager (3) > reviewer (2) > member (1)
```

### Role → Permission Matrix

| Permission | owner | manager | reviewer | member |
|------------|:-----:|:-------:|:--------:|:------:|
| `DASHBOARD_VIEW` | X | X | X | X |
| `REPOSITORY_VIEW` | X | X | X | X |
| `REPOSITORY_MANAGE` | X | X | - | - |
| `SCAN_VIEW` | X | X | X | X |
| `SCAN_RUN` | X | X | X | - |
| `FINDING_VIEW` | X | X | X | X |
| `FINDING_TRIAGE` | X | X | X | - |
| `FINDING_OVERRIDE_AI` | X | X | X | - |
| `REPORT_VIEW` | X | X | X | X |
| `REPORT_EXPORT` | X | X | X | - |
| `ARENA_VIEW` | X | X | X | X |
| `ARENA_MANAGE` | X | X | - | - |
| `MEMBER_VIEW` | X | X | X | X |
| `MEMBER_INVITE` | X | X | - | - |
| `MEMBER_MANAGE` | X | X | - | - |
| `TEAM_VIEW` | X | X | X | X |
| `TEAM_MANAGE` | X | X | - | - |
| `PROJECT_VIEW` | X | X | X | X |
| `PROJECT_MANAGE` | X | X | - | - |
| `INTEGRATION_VIEW` | X | X | X | X |
| `INTEGRATION_MANAGE` | X | X | - | - |
| `WEBHOOK_VIEW` | X | X | X | X |
| `WEBHOOK_MANAGE` | X | X | - | - |
| `SCHEDULE_VIEW` | X | X | X | X |
| `SCHEDULE_MANAGE` | X | X | - | - |
| `POLICY_VIEW` | X | X | X | - |
| `POLICY_MANAGE` | X | X | - | - |
| `SCANNER_VIEW` | X | X | X | X |
| `SCANNER_MANAGE` | X | X | - | - |
| `AI_MODEL_VIEW` | X | X | X | X |
| `AI_MODEL_MANAGE` | X | X | - | - |
| `KNOWLEDGE_VIEW` | X | X | X | X |
| `KNOWLEDGE_MANAGE` | X | X | - | - |
| `WORKSPACE_SETTINGS_VIEW` | X | X | X | X |
| `WORKSPACE_SETTINGS_MANAGE` | X | X | - | - |
| `AUDIT_VIEW` | X | X | X | - |

### Role Summary

| Role | Total | View Only | View + Manage | Special |
|------|-------|-----------|---------------|---------|
| `owner` | 35 | - | all | everything |
| `manager` | 35 | - | most | +MEMBER_INVITE |
| `reviewer` | 21 | 14 | 7 | +SCAN_RUN, +FINDING_TRIAGE, +FINDING_OVERRIDE_AI, +REPORT_EXPORT |
| `member` | 16 | 16 | - | view-only across all resources |

---

## Feature Flags

### Server-Side Only (no dedicated page)

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `scan.managed` | `FEATURE_FLAG_SCAN_MANAGED` | `true` | Managed scanning (SCM checkout + scanner run) |
| `scan.external_upload` | `FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD` | `true` | External CI upload endpoints |
| `ai.verification` | `FEATURE_FLAG_AI_VERIFICATION` | `true` | AI verification of findings |
| `scan_policies` | `FEATURE_FLAG_SCAN_PROFILES` | `true` | Scan policy configuration |

### Feature-Flagged Pages (13)

| Flag | Env Var | Default | Page Route |
|------|---------|---------|------------|
| `teams` | `FEATURE_FLAG_TEAMS` | `true` | `/{slug}/teams` |
| `projects` | `FEATURE_FLAG_PROJECTS` | `true` | `/{slug}/projects` |
| `knowledge_base` | `FEATURE_FLAG_KNOWLEDGE_BASE` | `true` | `/{slug}/knowledge-base` |
| `schedules` | `FEATURE_FLAG_SCHEDULES` | `false` | `/{slug}/schedules` |
| `reports` | `FEATURE_FLAG_REPORTS` | `true` | `/{slug}/reports` |
| `arena` | `FEATURE_FLAG_ARENA` | `false` | `/{slug}/arena` |
| `integration.github` | `FEATURE_FLAG_SOURCE_CONTROL_GITHUB` | `true` | `/{slug}/source-control` |
| `integration.gitlab` | `FEATURE_FLAG_SOURCE_CONTROL_GITLAB` | `true` | `/{slug}/source-control` |
| `integration.gitea` | `FEATURE_FLAG_SOURCE_CONTROL_GITEA` | `true` | `/{slug}/source-control` |
| `webhooks` | `FEATURE_FLAG_WEBHOOKS` | `false` | `/{slug}/webhooks` |
| `scanner_engines` | `FEATURE_FLAG_SCANNER_ENGINES` | `true` | `/{slug}/scanner-engines` |
| `models` | `FEATURE_FLAG_AI_MODELS` | `true` | `/{slug}/ai-models` |
| `quality.gates` | `FEATURE_FLAG_QUALITY_GATES` | `true` | `/{slug}/quality-gates` |

---

## Env Variables

Each feature flag has two env vars:

| Type | Prefix | Used By | Example |
|------|--------|---------|---------|
| Server | `FEATURE_FLAG_` | `resolveFeatureFlag()` — SSR, API routes | `FEATURE_FLAG_TEAMS=true` |
| Client | `NEXT_PUBLIC_FEATURE_FLAG_` | `useFeatureFlag()` — UI components | `NEXT_PUBLIC_FEATURE_FLAG_TEAMS=true` |

When unset, falls back to `FEATURE_FLAG_DEFAULTS` in `feature-flags.ts`.

### Complete Env Var List (`.env.example`)

```bash
# Server-side
FEATURE_FLAG_SCAN_MANAGED=true
FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD=true
FEATURE_FLAG_AI_VERIFICATION=true
FEATURE_FLAG_QUALITY_GATES=true
FEATURE_FLAG_TEAMS=true
FEATURE_FLAG_PROJECTS=true
FEATURE_FLAG_KNOWLEDGE_BASE=true
FEATURE_FLAG_SCHEDULES=false
FEATURE_FLAG_SOURCE_CONTROL_GITHUB=true
FEATURE_FLAG_SOURCE_CONTROL_GITLAB=true
FEATURE_FLAG_SOURCE_CONTROL_GITEA=true
FEATURE_FLAG_WEBHOOKS=false
FEATURE_FLAG_SCAN_PROFILES=true
FEATURE_FLAG_SCANNER_ENGINES=true
FEATURE_FLAG_AI_MODELS=true
FEATURE_FLAG_REPORTS=true
FEATURE_FLAG_ARENA=false

# Client-side (NEXT_PUBLIC_)
NEXT_PUBLIC_FEATURE_FLAG_SCAN_MANAGED=true
NEXT_PUBLIC_FEATURE_FLAG_SCAN_EXTERNAL_UPLOAD=true
NEXT_PUBLIC_FEATURE_FLAG_AI_VERIFICATION=true
NEXT_PUBLIC_FEATURE_FLAG_QUALITY_GATES=true
NEXT_PUBLIC_FEATURE_FLAG_TEAMS=true
NEXT_PUBLIC_FEATURE_FLAG_PROJECTS=true
NEXT_PUBLIC_FEATURE_FLAG_KNOWLEDGE_BASE=true
NEXT_PUBLIC_FEATURE_FLAG_SCHEDULES=false
NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITHUB=true
NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITLAB=true
NEXT_PUBLIC_FEATURE_FLAG_SOURCE_CONTROL_GITEA=true
NEXT_PUBLIC_FEATURE_FLAG_WEBHOOKS=false
NEXT_PUBLIC_FEATURE_FLAG_SCAN_PROFILES=true
NEXT_PUBLIC_FEATURE_FLAG_SCANNER_ENGINES=true
NEXT_PUBLIC_FEATURE_FLAG_AI_MODELS=true
NEXT_PUBLIC_FEATURE_FLAG_REPORTS=true
NEXT_PUBLIC_FEATURE_FLAG_ARENA=false
```

---

## Page Guards — Complete Reference

### Pattern: Top-Level vs Inline

```
Top-Level PermissionGate (VIEW)  →  Controls whether user can SEE the page
Inline PermissionGate (MANAGE)   →  Controls whether user can PERFORM actions
```

**Rule:** Every page that has a VIEW permission uses it as the top-level gate.
Action buttons use MANAGE permissions as inline gates.

### Non-Feature-Flagged Pages

| Page | Route | Top-Level Gate | Inline Gate | API Permissions |
|------|-------|---------------|-------------|-----------------|
| Dashboard | `/{slug}` | - | - | `DASHBOARD_VIEW` |
| Repositories | `/{slug}/repositories` | - | - | `REPOSITORY_VIEW` |
| Scan | `/{slug}/scan` | `SCAN_VIEW` | `SCAN_RUN` | `SCAN_VIEW`, `SCAN_RUN` |
| Findings | `/{slug}/findings` | `FINDING_VIEW` | `FINDING_OVERRIDE_AI` | `SCAN_VIEW`, `FINDING_TRIAGE`, `FINDING_OVERRIDE_AI` |
| Members | `/{slug}/members` | `MEMBER_VIEW` | `MEMBER_INVITE` | `MEMBER_VIEW`, `MEMBER_INVITE`, `MEMBER_MANAGE` |
| Profile | `/{slug}/profile` | - | - | - (personal) |
| Settings | `/{slug}/settings` | - | `WORKSPACE_SETTINGS_MANAGE` | `WORKSPACE_SETTINGS_VIEW`, `WORKSPACE_SETTINGS_MANAGE` |

### Feature-Flagged Pages

| Page | Route | FeatureGate | Top-Level PermissionGate | Inline Gate | API Permissions |
|------|-------|-------------|-------------------------|-------------|-----------------|
| Teams | `/{slug}/teams` | `TEAMS` | `TEAM_VIEW` | `TEAM_MANAGE` | `TEAM_VIEW`, `TEAM_MANAGE` |
| Projects | `/{slug}/projects` | `PROJECTS` | `PROJECT_VIEW` | `PROJECT_MANAGE` | `PROJECT_VIEW`, `PROJECT_MANAGE` |
| Schedules | `/{slug}/schedules` | `SCHEDULES` | `SCHEDULE_VIEW` | `SCHEDULE_MANAGE` | `SCHEDULE_VIEW`, `SCHEDULE_MANAGE` |
| Reports | `/{slug}/reports` | `REPORTS` | `REPORT_VIEW` | `REPORT_EXPORT` | `REPORT_VIEW`, `REPORT_EXPORT` |
| Arena | `/{slug}/arena` | `ARENA` | `ARENA_VIEW` | - | `ARENA_MANAGE` |
| Source Control | `/{slug}/source-control` | `anyFlags[3 SCM]` | `INTEGRATION_VIEW` | `INTEGRATION_MANAGE` | `INTEGRATION_VIEW`, `INTEGRATION_MANAGE` |
| Webhooks | `/{slug}/webhooks` | `WEBHOOKS` | `WEBHOOK_VIEW` | `WEBHOOK_MANAGE` | `WEBHOOK_MANAGE` |
| Scanner Engines | `/{slug}/scanner-engines` | `SCANNER_ENGINES` | `SCANNER_VIEW` | `SCANNER_MANAGE` | `SCANNER_MANAGE` |
| AI Models | `/{slug}/ai-models` | `AI_MODELS` | `AI_MODEL_VIEW` | `AI_MODEL_MANAGE` | `AI_MODEL_VIEW`, `AI_MODEL_MANAGE` |
| Quality Gates | `/{slug}/quality-gates` | `QUALITY_GATES` | `POLICY_VIEW` | `POLICY_MANAGE` | `POLICY_VIEW`, `POLICY_MANAGE` |
| Knowledge Base | `/{slug}/knowledge-base` | `KNOWLEDGE_BASE` | `KNOWLEDGE_VIEW` | `KNOWLEDGE_MANAGE` | `KNOWLEDGE_VIEW`, `KNOWLEDGE_MANAGE` |

### Sub-Pages (no sidebar entry)

| Page | Route | FeatureGate | Top-Level Gate |
|------|-------|-------------|----------------|
| Teams New | `/{slug}/teams/new` | `TEAMS` | - |
| Teams Edit | `/{slug}/teams/[teamId]/edit` | `TEAMS` | - |
| Projects New | `/{slug}/projects/new` | `PROJECTS` | - |
| Projects Detail | `/{slug}/projects/[projectId]` | `PROJECTS` | - |
| Projects Edit | `/{slug}/projects/[projectId]/edit` | `PROJECTS` | - |
| Projects Repo | `/{slug}/projects/[projectId]/repositories/[repoId]` | `PROJECTS` | - |
| Security | `/{slug}/security` | - | redirect → `/profile` |

---

## API Route Permissions — Complete Reference

### Dashboard

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/dashboard/stats` | GET | `DASHBOARD_VIEW` |
| `/api/v1/dashboard/scans` | GET | `DASHBOARD_VIEW` |
| `/api/v1/dashboard/findings` | GET | `DASHBOARD_VIEW` |
| `/api/v1/dashboard/health` | GET | `DASHBOARD_VIEW` |

### Repositories

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/repositories` | GET | `REPOSITORY_VIEW` |
| `/api/v1/workspaces/:id/repositories/:repoId` | PATCH | `REPOSITORY_MANAGE` |
| `/api/v1/workspaces/:id/repositories/:repoId/branches` | GET | `REPOSITORY_VIEW` |

### Scans

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/scans` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/scans` | POST | `SCAN_RUN` |
| `/api/v1/workspaces/:id/scans/:scanId` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/scans/upload` | POST | `SCAN_RUN` |
| `/api/v1/workspaces/:id/scanners` | GET | `SCAN_VIEW` |

### Findings

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/findings` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/findings/:findingId` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/findings/:findingId` | PATCH | `FINDING_TRIAGE` |
| `/api/v1/workspaces/:id/findings/:findingId/verify` | POST | `FINDING_OVERRIDE_AI` |
| `/api/v1/workspaces/:id/findings/ai-verify` | POST | `FINDING_OVERRIDE_AI` |
| `/api/v1/workspaces/:id/findings/bulk` | PUT | `FINDING_TRIAGE` |

### Reports

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/reports` | GET | `REPORT_VIEW` |
| `/api/v1/workspaces/:id/reports` | POST | `REPORT_EXPORT` |
| `/api/v1/workspaces/:id/reports/:reportId` | GET | `REPORT_VIEW` |
| `/api/v1/workspaces/:id/reports/:reportId` | DELETE | `REPORT_EXPORT` |
| `/api/v1/workspaces/:id/reports/:reportId/download` | GET | `REPORT_VIEW` |
| `/api/v1/workspaces/:id/reports/:reportId/preview` | GET | `REPORT_VIEW` |

### Members & Invitations

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/members` | GET | `MEMBER_VIEW` |
| `/api/v1/workspaces/:id/members/:userId` | PATCH | `MEMBER_MANAGE` |
| `/api/v1/workspaces/:id/members/:userId` | DELETE | `MEMBER_MANAGE` |
| `/api/v1/workspaces/:id/invitations` | GET | `MEMBER_MANAGE` |
| `/api/v1/workspaces/:id/invitations` | POST | `MEMBER_INVITE` |
| `/api/v1/workspaces/:id/invitations/:invitationId` | DELETE | `MEMBER_MANAGE` |
| `/api/v1/auth/invite` | POST | `MEMBER_INVITE` |

### Teams

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/teams` | GET | `TEAM_VIEW` |
| `/api/v1/workspaces/:id/teams` | POST | `TEAM_MANAGE` |
| `/api/v1/workspaces/:id/teams/:teamId` | GET | `TEAM_VIEW` |
| `/api/v1/workspaces/:id/teams/:teamId` | PUT | `TEAM_MANAGE` |
| `/api/v1/workspaces/:id/teams/:teamId` | DELETE | `TEAM_MANAGE` |
| `/api/v1/workspaces/:id/teams/:teamId/members` | GET | `TEAM_VIEW` |

### Projects

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/projects` | GET | `PROJECT_VIEW` |
| `/api/v1/workspaces/:id/projects` | POST | `PROJECT_MANAGE` |
| `/api/v1/workspaces/:id/projects/:projectId` | GET | `PROJECT_VIEW` |
| `/api/v1/workspaces/:id/projects/:projectId` | PUT | `PROJECT_MANAGE` |
| `/api/v1/workspaces/:id/projects/:projectId` | DELETE | `PROJECT_MANAGE` |
| `/api/v1/workspaces/:id/projects/:projectId/api-tokens` | GET | `PROJECT_VIEW` |
| `/api/v1/workspaces/:id/projects/:projectId/api-tokens` | POST | `PROJECT_MANAGE` |
| `/api/v1/workspaces/:id/projects/:projectId/api-tokens/:tokenId` | DELETE | `PROJECT_MANAGE` |
| `/api/v1/workspaces/:id/projects/:projectId/members` | GET | `PROJECT_MANAGE` |

### Source Controls / Integrations

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/source-controls` | GET | `INTEGRATION_VIEW` |
| `/api/v1/workspaces/:id/source-controls` | POST | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId` | GET | `INTEGRATION_VIEW` |
| `/api/v1/workspaces/:id/source-controls/:providerId` | PATCH | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId` | PUT | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId` | DELETE | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId/repos` | GET | `INTEGRATION_VIEW` |
| `/api/v1/workspaces/:id/source-controls/:providerId/import` | POST | `REPOSITORY_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId/sync` | POST | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/:providerId/test` | POST | `INTEGRATION_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/imports/:importId` | DELETE | `REPOSITORY_MANAGE` |
| `/api/v1/workspaces/:id/source-controls/test-event` | POST | `INTEGRATION_MANAGE` |

### Webhooks

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/webhooks` | GET | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks` | POST | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks/:webhookId` | GET | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks/:webhookId` | PUT | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks/:webhookId` | DELETE | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks/:webhookId/deliveries` | GET | `WEBHOOK_MANAGE` |
| `/api/v1/workspaces/:id/webhooks/:webhookId/test` | POST | `WEBHOOK_MANAGE` |

### Schedules

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/schedules` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/schedules` | POST | `SCHEDULE_MANAGE` |
| `/api/v1/workspaces/:id/schedules/:scheduleId` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/schedules/:scheduleId` | PUT | `SCHEDULE_MANAGE` |
| `/api/v1/workspaces/:id/schedules/:scheduleId` | DELETE | `SCHEDULE_MANAGE` |
| `/api/v1/workspaces/:id/schedules/:scheduleId/toggle` | PUT | `SCHEDULE_MANAGE` |

### AI Models

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/model` | GET | `AI_MODEL_VIEW` |
| `/api/v1/workspaces/:id/model` | POST | `AI_MODEL_MANAGE` |
| `/api/v1/workspaces/:id/model/:modelId` | GET | `AI_MODEL_VIEW` |
| `/api/v1/workspaces/:id/model/:modelId` | PUT | `AI_MODEL_MANAGE` |
| `/api/v1/workspaces/:id/model/:modelId` | DELETE | `AI_MODEL_MANAGE` |
| `/api/v1/workspaces/:id/model/:modelId/test` | POST | `AI_MODEL_MANAGE` |

### Quality Gates / Policies

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/quality-gates` | GET | `POLICY_VIEW` |
| `/api/v1/quality-gates` | PUT | `POLICY_MANAGE` |
| `/api/v1/workspaces/:id/settings/pr-review` | GET | `SCAN_VIEW` |
| `/api/v1/workspaces/:id/settings/pr-review` | PUT | `POLICY_MANAGE` |

### Knowledge Base

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id/knowledge-base` | GET | `KNOWLEDGE_VIEW` |
| `/api/v1/workspaces/:id/knowledge-base` | POST | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-base/:entryId` | GET | `KNOWLEDGE_VIEW` |
| `/api/v1/workspaces/:id/knowledge-base/:entryId` | PATCH | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-base/:entryId` | DELETE | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-sources` | GET | `KNOWLEDGE_VIEW` |
| `/api/v1/workspaces/:id/knowledge-sources` | POST | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-sources/:sourceId` | GET | `KNOWLEDGE_VIEW` |
| `/api/v1/workspaces/:id/knowledge-sources/:sourceId` | PATCH | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-sources/:sourceId` | DELETE | `KNOWLEDGE_MANAGE` |
| `/api/v1/workspaces/:id/knowledge-sources/:sourceId/backfill` | GET | `KNOWLEDGE_VIEW` |
| `/api/v1/workspaces/:id/knowledge-sources/:sourceId/backfill` | POST | `KNOWLEDGE_MANAGE` |

### Workspace Settings

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/workspaces/:id` | GET | `WORKSPACE_SETTINGS_VIEW` |
| `/api/v1/workspaces/:id` | PUT | `WORKSPACE_SETTINGS_MANAGE` |
| `/api/v1/workspaces/:id/settings/verification` | GET | `AI_MODEL_VIEW` |
| `/api/v1/workspaces/:id/settings/verification` | PUT | `WORKSPACE_SETTINGS_MANAGE` |

### Audit / Activity Logs

| Route | Method | Permission |
|-------|--------|------------|
| `/api/v1/audit-logs` | GET | `AUDIT_VIEW` |
| `/api/v1/activity-logs` | GET | `AUDIT_VIEW` |

---

## Sidebar Navigation

### Structure

```
Navigate
  ├── Dashboard          (always)
  ├── Repositories       (always)
  ├── Scans              (always)
  ├── Findings           (always)
  ├── Reports            (if FEATURE_FLAG.REPORTS)
  └── Arena              (if FEATURE_FLAG.ARENA)

Manage
  ├── Members            (if PERMISSION.MEMBER_VIEW)
  ├── Teams              (if FEATURE_FLAG.TEAMS)
  ├── Projects           (if FEATURE_FLAG.PROJECTS)
  └── Schedules          (if FEATURE_FLAG.SCHEDULES)

Configure
  ├── Profile            (always)
  ├── Source Control     (if ANY SCM flag enabled)
  ├── Webhooks           (if FEATURE_FLAG.WEBHOOKS)
  ├── Scanner Engines    (if FEATURE_FLAG.SCANNER_ENGINES)
  ├── AI Models          (if FEATURE_FLAG.AI_MODELS)
  ├── Quality Gates      (if FEATURE_FLAG.QUALITY_GATES)
  ├── Knowledge Base     (if FEATURE_FLAG.KNOWLEDGE_BASE)
  └── Workspace Settings (always)
```

### Guard Rules

| Item | Guard Type | Check |
|------|------------|-------|
| Dashboard | Always visible | - |
| Repositories | Always visible | - |
| Scans | Always visible | - |
| Findings | Always visible | - |
| Reports | Feature flag | `flags[FEATURE_FLAG.REPORTS]` |
| Arena | Feature flag | `flags[FEATURE_FLAG.ARENA]` |
| Members | Permission | `has(PERMISSION.MEMBER_VIEW)` |
| Teams | Feature flag | `flags[FEATURE_FLAG.TEAMS]` |
| Projects | Feature flag | `flags[FEATURE_FLAG.PROJECTS]` |
| Schedules | Feature flag | `flags[FEATURE_FLAG.SCHEDULES]` |
| Profile | Always visible | - |
| Source Control | Feature flag (OR) | `[GITHUB, GITLAB, GITEA].some(f => flags[f])` |
| Webhooks | Feature flag | `flags[FEATURE_FLAG.WEBHOOKS]` |
| Scanner Engines | Feature flag | `flags[FEATURE_FLAG.SCANNER_ENGINES]` |
| AI Models | Feature flag | `flags[FEATURE_FLAG.AI_MODELS]` |
| Quality Gates | Feature flag | `flags[FEATURE_FLAG.QUALITY_GATES]` |
| Knowledge Base | Feature flag | `flags[FEATURE_FLAG.KNOWLEDGE_BASE]` |
| Workspace Settings | Always visible | - |

**Rule:** Feature-flagged items check feature flag only. If feature is OFF, permission is irrelevant.

### Active State

`getActiveKey(pathname)` extracts the first path segment after workspace slug:
- `/{slug}/scan` → `scan`
- `/{slug}/projects/abc123` → `projects` (matches parent nav)
- `/{slug}/teams/new` → `teams` (matches parent nav)

---

## Topbar Navigation

### WorkspaceSwitcher

Dropdown menu with:
- Current workspace display
- Other workspace list with role labels
- "All workspaces" link → `/workspaces`
- **Profile** → `/{slug}/profile`
- **Account security** → `/{slug}/profile`
- **Sign out** → `/auth/signin`

### Topbar Props

```tsx
<WorkspaceSwitcher
  user={user}
  currentWorkspace={currentWorkspace}
  currentWorkspaceDetails={currentWorkspaceDetails}
  workspaces={workspaces.data}
  accountOpen={accountOpen}
  onToggleAccount={() => setAccountOpen((o) => !o)}
  onSwitch={handleSwitch}
  onGoToChooser={goToWorkspaceChooser}
  onSignout={handleSignout}
  onNavigate={(href) => { setAccountOpen(false); router.push(href); }}
/>
```

---

## Auth Flow

```
Request → (authenticated)/layout.tsx
  └─ QueryProvider
      └─ AuthenticatedShell
          ├─ pathname === /workspaces? → pass through (no shell)
          ├─ session loading? → <LoadingState>
          ├─ session error? → redirect /auth/signin
          ├─ workspace slug mismatch? → redirect /workspaces
          └─ all good → AppShell
              ├─ SidebarNav (feature flags + permissions)
              ├─ WorkspaceSwitcher (topbar)
              └─ children (page content)
                  ├─ FeatureGate (if feature-flagged)
                  │   └─ PermissionGate VIEW (top-level)
                  │       └─ PageContent
                  │           └─ PermissionGate MANAGE (inline)
```

---

## Component Reference

### `<FeatureGate>`

Conditional rendering based on feature flag state.

```tsx
import { FeatureGate } from '@/commons/components/FeatureGate';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';

// Single flag
<FeatureGate flag={FEATURE_FLAG.TEAMS} fallback={<ComingSoonCard />}>
  <TeamsPage />
</FeatureGate>

// Multi-flag OR (Source Control uses 3 SCM flags)
<FeatureGate
  anyFlags={[
    FEATURE_FLAG.SOURCE_CONTROL_GITHUB,
    FEATURE_FLAG.SOURCE_CONTROL_GITLAB,
    FEATURE_FLAG.SOURCE_CONTROL_GITEA,
  ]}
  fallback={<ComingSoonCard />}
>
  <SourceControlPage />
</FeatureGate>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `flag` | `FeatureFlagKey` | Single flag to check |
| `anyFlags` | `FeatureFlagKey[]` | Multiple flags — renders if ANY is enabled (OR) |
| `children` | `ReactNode` | Content when flag(s) enabled |
| `fallback` | `ReactNode` | Content when flag(s) disabled (default: `null`) |

### `<PermissionGate>`

Conditional rendering based on permission or role.

```tsx
import { PermissionGate } from '@/commons/components/PermissionGate';
import { PERMISSION } from '@/commons/constants/permissions';

// Top-level page gate (VIEW)
<PermissionGate permission={PERMISSION.SCAN_VIEW} fallback={<PermissionHint />}>
  <ScanPageContent />
</PermissionGate>

// Inline action gate (MANAGE)
<PermissionGate permission={PERMISSION.SCAN_RUN}>
  <Button>New scan</Button>
</PermissionGate>

// Role-based
<PermissionGate minRole="manager">
  <AdminPanel />
</PermissionGate>

// Multiple permissions (AND)
<PermissionGate anyOf={[PERMISSION.TEAM_VIEW, PERMISSION.TEAM_MANAGE]}>
  <TeamContent />
</PermissionGate>
```

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `permission` | `PermissionKey` | Single permission check |
| `anyOf` | `PermissionKey[]` | All listed permissions required (AND) |
| `oneOf` | `PermissionKey[]` | Any listed permission suffices (OR) |
| `minRole` | `Role` | Minimum role required |
| `children` | `ReactNode` | Content when check passes |
| `fallback` | `ReactNode` | Content when check fails (default: `null`) |

### `<PermissionHint>`

Informative "access denied" alert. Use as fallback in `PermissionGate`.

```tsx
<PermissionGate
  permission={PERMISSION.MEMBER_VIEW}
  fallback={<PermissionHint permission={PERMISSION.MEMBER_VIEW} />}
>
  <MembersPage />
</PermissionGate>
```

### `usePermissions()`

Imperative hook for DataTable `show` callbacks and conditional logic.

```tsx
import { usePermissions } from '@/lib/hooks/usePermissions';
import { PERMISSION } from '@/commons/constants/permissions';

const { has, hasAll, hasAny, isAtLeast, role, permissions, isLoading } = usePermissions();

// Single check
const canManage = has(PERMISSION.TEAM_MANAGE);

// All required (AND)
const canAccess = hasAll(PERMISSION.TEAM_VIEW, PERMISSION.TEAM_MANAGE);

// Any suffices (OR)
const canDoSomething = hasAny(PERMISSION.FINDING_TRIAGE, PERMISSION.FINDING_OVERRIDE_AI);

// Role hierarchy
const isAdmin = isAtLeast('manager');
```

### `useFeatureFlag()` / `useFeatureFlags()`

Client-side feature flag hooks.

```tsx
import { useFeatureFlag, useFeatureFlags } from '@/lib/hooks/useFeatureFlag';
import { FEATURE_FLAG } from '@/commons/constants/feature-flags';

// Single flag
const { enabled, isLoading } = useFeatureFlag(FEATURE_FLAG.TEAMS);

// Multiple flags
const { flags, isLoading } = useFeatureFlags([
  FEATURE_FLAG.SOURCE_CONTROL_GITHUB,
  FEATURE_FLAG.SOURCE_CONTROL_GITLAB,
  FEATURE_FLAG.SOURCE_CONTROL_GITEA,
]);
// flags[FEATURE_FLAG.SOURCE_CONTROL_GITHUB] → boolean
```

### `resolveFeatureFlag()` (Server-side)

```tsx
import { resolveFeatureFlag, FEATURE_FLAG } from '@/commons/constants/feature-flags';

// In API route or SSR
if (!resolveFeatureFlag(FEATURE_FLAG.SCHEDULES)) {
  return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
}
```

### `requirePermission()` (Server-side API guard)

```tsx
import { requirePermission, withWorkspaceId } from '@/server/modules/workspace/workspace.middleware';
import { PERMISSION } from '@/commons/constants/permissions';

// GET — view permission
const result = await requirePermission(
  withWorkspaceId(request, workspaceId),
  auth.context,
  PERMISSION.TEAM_VIEW
);
if (!result.success) return result.response;

// POST/PUT/DELETE — manage permission
const result = await requirePermission(
  withWorkspaceId(request, workspaceId),
  auth.context,
  PERMISSION.TEAM_MANAGE
);
if (!result.success) return result.response;
```

---

## Adding a New Feature

### Step-by-step

1. **Add permission** to `PERMISSION` in `permissions.ts`
2. **Add to `PERMISSION_DEFINITIONS`** array with description
3. **Add to `ROLE_PERMISSIONS`** for each role (owner, manager, reviewer, member)
4. **Add feature flag** to `FEATURE_FLAG` in `feature-flags.ts` (if feature-flagged)
5. **Add to** `FLAG_ENV_MAP`, `FEATURE_FLAG_DEFAULTS`, `FEATURE_FLAG_LABELS`
6. **Add env vars** to `.env.example` (both `FEATURE_FLAG_*` and `NEXT_PUBLIC_FEATURE_FLAG_*`)
7. **Create page** with:
   ```tsx
   <FeatureGate flag={FEATURE_FLAG.NEW_FEATURE} fallback={<ComingSoonCard />}>
     <PermissionGate permission={PERMISSION.NEW_FEATURE_VIEW} fallback={<PermissionHint />}>
       <PageContent />
     </PermissionGate>
   </FeatureGate>
   ```
8. **Add inline gates** for action buttons:
   ```tsx
   <PermissionGate permission={PERMISSION.NEW_FEATURE_MANAGE}>
     <Button>Action</Button>
   </PermissionGate>
   ```
9. **Add sidebar nav item** in `AppShell.tsx`:
   ```tsx
   ...(flags[FEATURE_FLAG.NEW_FEATURE]
     ? [{ key: 'new-feature', label: 'New Feature', icon: 'fa-icon', href: ROUTES.WORKSPACE.NEW_FEATURE(workspaceSlug) }]
     : []),
   ```
10. **Add API route** with permission guard:
    ```tsx
    // GET
    await requirePermission(req, auth, PERMISSION.NEW_FEATURE_VIEW);
    // POST/PUT/DELETE
    await requirePermission(req, auth, PERMISSION.NEW_FEATURE_MANAGE);
    ```
11. **Add route** to `ROUTES.WORKSPACE` in `routes.ts`

---

## Troubleshooting

### Page visible but no action buttons

**Cause:** Top-level VIEW permission passes, but MANAGE permission missing.
**Fix:** Check `ROLE_PERMISSIONS` — user's role may not have the MANAGE permission.

### Nav item not showing

**Cause:** Feature flag is OFF or permission check fails.
**Fix:** Check `FEATURE_FLAG_DEFAULTS` and `ROLE_PERMISSIONS` for user's role.

### Page shows "access denied" hint

**Cause:** Top-level `PermissionGate` VIEW check failed.
**Fix:** Verify user's role has the VIEW permission in `ROLE_PERMISSIONS`.

### API returns 403

**Cause:** `requirePermission()` check failed.
**Fix:** Check the API route's required permission vs user's role permissions.

### Feature flag not taking effect

**Cause:** Env var not set or wrong prefix.
**Fix:** Server needs `FEATURE_FLAG_*`, client needs `NEXT_PUBLIC_FEATURE_FLAG_*`. Both must be `"true"` or `"1"`.

---

**Last Updated:** 2026-06-24

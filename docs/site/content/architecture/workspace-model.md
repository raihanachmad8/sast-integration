# Workspace Model

## Overview

SAST Integration uses a workspace-based multi-tenant architecture. Workspaces isolate data, members, and configurations.

## Hierarchy

```
Organization
  └── Workspace
        ├── Members (with roles)
        ├── Teams
        ├── Projects
        │   ├── Repositories
        │   ├── API Tokens
        │   └── Members
        ├── Scans
        ├── Findings
        ├── Reports
        └── Settings
```

## Workspace Structure

| Entity | Description |
|--------|-------------|
| Workspace | Top-level container, owns all data |
| Member | User with a role in the workspace |
| Team | Group of members for organization |
| Project | Logical grouping of repositories |
| Repository | Git repository connected via SCM |

## Role Hierarchy

```
owner (4) > manager (3) > reviewer (2) > member (1)
```

| Role | Capabilities |
|------|-------------|
| Owner | Full access, manage billing, delete workspace |
| Manager | Most access, invite members, manage settings |
| Reviewer | Run scans, triage findings, export reports |
| Member | View-only access across all resources |

## Multi-Workspace

Users can belong to multiple workspaces:

- Workspace switcher in topbar
- Each workspace has independent data
- Role can differ per workspace
- "All Workspaces" view for workspace management

## Permission System

### Format

```
resource:action
```

### Resources (18)

dashboard, repository, scan, finding, report, arena, member, team, project, integration, webhook, schedule, policy, scanner, ai_model, knowledge, workspace, audit

### Actions (9)

view, manage, run, triage, override_ai, export, invite, settings, read

### Total Permissions: 37

## Feature Flags

Each workspace can have different features enabled:

| Flag | Default | Description |
|------|---------|-------------|
| teams | true | Team management |
| projects | true | Project organization |
| knowledge_base | true | CWE/NVD knowledge |
| schedules | false | Recurring scans |
| reports | true | PDF/XLSX reports |
| arena | false | AI comparison |
| webhooks | false | Outgoing webhooks |
| scanner_engines | true | Scanner configuration |
| models | true | AI model management |
| quality.gates | true | Quality gate policies |
| source_control.github | true | GitHub integration |
| source_control.gitlab | true | GitLab integration |
| source_control.gitea | true | Gitea integration |

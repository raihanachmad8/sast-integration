# Project Access Control

## Overview

Projects provide an additional layer of access control within workspaces. Each project can have its own members, repositories, and API tokens.

## Project Structure

```
Workspace
  └── Project
        ├── Members (with roles)
        ├── Repositories
        ├── API Tokens
        └── Scan Policies
```

## Project Members

| Role | Capabilities |
|------|-------------|
| owner | Full project access |
| manager | Manage settings, members |
| member | View and run scans |

## Access Control Rules

1. **Workspace scope**: Projects belong to a workspace
2. **Member scope**: Users must be workspace members
3. **Project membership**: Optional project-level membership
4. **Repository scope**: Repositories can be assigned to projects

## API Token Scope

Project API tokens are scoped to a single project:

```typescript
interface ProjectApiToken {
  id: string;
  project_id: string;
  name: string;
  token_hash: string;
  created_at: Date;
}
```

## API Endpoints

| Method | Endpoint | Permission |
|--------|----------|-----------|
| GET | `/projects` | `PROJECT_VIEW` |
| POST | `/projects` | `PROJECT_MANAGE` |
| GET | `/projects/:projectId` | `PROJECT_VIEW` |
| PUT | `/projects/:projectId` | `PROJECT_MANAGE` |
| DELETE | `/projects/:projectId` | `PROJECT_MANAGE` |
| GET | `/projects/:projectId/api-tokens` | `PROJECT_VIEW` |
| POST | `/projects/:projectId/api-tokens` | `PROJECT_MANAGE` |
| DELETE | `/projects/:projectId/api-tokens/:tokenId` | `PROJECT_MANAGE` |
| GET | `/projects/:projectId/members` | `PROJECT_MANAGE` |

## Feature Flag

Projects require `FEATURE_FLAG_PROJECTS=true`.

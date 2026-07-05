# Coding Conventions

**Purpose**: This document defines the consistent coding standards used throughout the SAST Integration codebase to ensure maintainability, readability, and alignment with the project's architectural principles.

## Naming

- **Language**: English only for code, comments, and variable names
- **Files**:
  - Non-component files: `kebab-case.ts` (services, repositories, schemas, hooks, utilities, actions)
  - Component files: `PascalCase.tsx` matching the exported component name
- **Components**: PascalCase (e.g., `ScanResultsTable`)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase (e.g., ScanResult, CreateScanInput)
- **Enums**: PascalCase name, UPPER_SNAKE_CASE values

## File Name Examples

```text
ScanResultsTable.tsx        # Component
use-scan-filters.ts         # Hook
scan.service.ts             # Service
scan.repository.ts          # Repository
scan.schema.ts              # Validation schema
scan.types.ts               # Types (if separate file needed)
create-scan.action.ts       # Server action
```

## Constants

- **Feature-level**: Define in `features/<name>/constants.ts`
- **Shared**: Define in `commons/constants/`
- **Server**: Define in `server/modules/<module>/constants.ts`
- Never scatter magic values — extract to named constants

## API Routes

- All routes under /api/v1/
- RESTful naming: /api/v1/scans, /api/v1/scans/:id/results
- Always return the standard response envelope
- Use Zod for request validation in route handlers
- HTTP methods: GET (read), POST (create), PATCH (update), DELETE (remove)

## Components

- **Server Components** by default — no directive needed
- **'use client'** only when required:
  - Using Ant Design interactive components
  - Using React hooks (useState, useEffect, etc.)
  - Event handlers (onClick, onChange, etc.)
- Prefer composition: server component wraps client component
- Keep client components small and focused

## Imports

Prefer @/ path aliases. Group imports in this order:

```typescript
// 1. React / Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. Third-party libraries
import { Button, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';

// 3. Internal — absolute paths
import { ApiResponse } from '@/commons/types';
import { scanService } from '@/server/modules/scan/scan.service';

// 4. Internal — relative paths
import { ScanResultsTable } from './components';
import { SCAN_STATUS } from './constants';
```

## Types

- **Infer from Drizzle schema** wherever possible:
  ```typescript
  import { scans } from '@drizzle/schema/scans';
  type Scan = typeof scans.$inferSelect;
  type NewScan = typeof scans.$inferInsert;
  ```
- Avoid duplicating database types manually
- Use Zod `.infer<>` for validated input types
- Export shared types from `commons/types/`

## Environment Variables

- **Never** import `process.env` directly in application code
- All env vars validated via Zod in `server/env.ts`
- Import from server:
  ```typescript
  import { env } from '@/server/env';
  ```
- Required vars fail fast at startup if missing
- Use `.env.example` as the source of truth for required variables

## Backend Module Contract

This contract standardizes repository and service method naming across workspace-scoped modules (`members`, `teams`, `projects`, etc.). Consistent naming makes code predictable, simplifies mocking in tests, and reduces cognitive load when switching between modules.

### Repository contract

Each repository exposes the following common CRUD primitives. Optional parameters such as `params` or `tx` may differ by module, but the method names stay the same.

| Method | Purpose | Notes |
|---|---|---|
| `create(data, tx?)` | Insert a new record | Returns the created record. |
| `update(id, data, tx?)` | Update a record by ID | Returns the updated record. |
| `softDelete(id, deletedBy, tx?)` | Soft delete a record by ID | Not all modules use soft delete (see exceptions). |
| `findById(id, tx?)` | Fetch one record by ID | Returns `null` when not found. |
| `list(workspaceId, params?, tx?)` | Paginated list | The default list method must be paginated. |
| `listAll(workspaceId, tx?)` | Non-paginated list | Use only when callers explicitly need every record. |
| `set<Relation>(id, relatedIds, tx?)` | Replace a relation collection | Example: `setMembers`, `setTeams`, `setRepositories`. |

Rules:
- Use `findById` (not `getById`) in repositories; `getById` is reserved for services that also enforce permissions.
- The paginated list method is always named `list`. If a module previously had `listPaginated`, rename it to `list` and rename the non-paginated variant to `listAll`.
- Always accept an optional `tx?: Tx` parameter and use `const exec = tx ?? db;` for transaction-aware queries.

### Service contract

Each service exposes the following common operations. Permission checks live in the service layer, not the repository.

| Method | Purpose |
|---|---|
| `list(workspaceId, userId, params?)` | List records with permission check. |
| `getById(workspaceId, id, userId)` | Fetch one record with permission check. |
| `create(workspaceId, input, userId)` | Create a record with permission check. |
| `update(workspaceId, id, input, userId)` | Update a record with permission check. |
| `softDelete(workspaceId, id, userId)` | Soft delete a record with permission check. |

Rules:
- Services call repositories; they do not issue raw DB queries except for cross-module transactions.
- Multi-step writes (metadata + relation replacement) must happen inside a single `db.transaction`.
- Domain-specific operations (for example `changeRole` in members) are allowed and should be named after the business action, not forced into the generic contract.

### Omitted methods and exceptions

Not every module needs every method. The contract is a naming guide, not an implementation requirement.

- **Members** are workspace join records, not first-class entities, so they use `remove` (hard delete from `workspaceMembers`) instead of `softDelete`. This is acceptable because the operation is conceptually different.
- **Teams/Projects** are entities with soft-delete columns, so they implement `softDelete`.
- A module may omit `getById` or `listAll` if there is no current use case, but if added later it must follow this contract.

## Backend Contract Types

The shared repository and service contracts live in `src/server/modules/shared/contracts.ts`.

```typescript
export interface IRepository<T, CreateInput, UpdateInput, ListQuery> { ... }
export interface IEntityService<T, CreateInput, UpdateInput, ListQuery> { ... }
export interface Paginated<T> { ... }
```

Rules:

- `CreateInput` and `UpdateInput` must be derived from Zod schemas, not hand-written DTOs. This keeps frontend forms and backend services aligned.
  - Example: `type CreateTeamData = Omit<TeamFormInput, 'memberIds'>;`
  - Example: `type UpdateProjectData = Omit<ProjectUpdateInput, 'memberIds' | 'teamIds' | 'repositoryIds'>;`
- Workspace metadata (`workspaceId`, `createdBy`, `updatedBy`) are passed as separate parameters so the `data` object remains a pure schema shape.
- Repositories implement the contract explicitly: `class TeamRepository implements IRepository<TeamRow, CreateTeamData, UpdateTeamData, TeamListQuery>`.
- Services implement the contract explicitly: `class TeamService implements IEntityService<TeamRow, TeamFormInput, TeamUpdateInput, TeamListQuery>`.

## Service Validators

Complex business-rule validation belongs in module-scoped validator files, not inlined in services or dumped in global utilities.

### Location and naming

- File: `src/server/modules/<module>/services/<module>.validators.ts`
- Examples:
  - `src/server/modules/members/services/member.validators.ts`
  - `src/server/modules/invitations/services/invitation.validators.ts`
- Each validator is a pure function named `assertXxx(...)` that throws an `AppError` on violation.

### Responsibility split

| Layer | Validates | Example |
|---|---|---|
| Route handler (Zod schema) | Shape, type, format | Is `role` a string? Is `email` valid? |
| Service validator | Business rules, permissions, hierarchy | Can an owner be removed? Can a manager change an owner's role? |

### When to extract a validator

Extract a validator when a service method contains:

- Repeated permission or state checks across multiple methods.
- Non-trivial hierarchy rules (e.g., role rank comparisons).
- Multi-condition checks that hide the main flow.

### Examples

```typescript
// src/server/modules/members/services/member.validators.ts
export function assertValidRole(role: string, errorCode: string): void {
  if (!WORKSPACE_ROLE[role]) {
    throw new AppError(memberErrors.INVALID_ROLE, 400, errorCode);
  }
}

export function assertCanChangeRole(
  actorRole: WorkspaceRole,
  currentRole: WorkspaceRole,
  newRole: WorkspaceRole,
  errorCode: string,
): void {
  const actorRank = ROLE_RANK[actorRole];
  const currentRank = ROLE_RANK[currentRole];
  const newRank = ROLE_RANK[newRole];

  if (actorRank < currentRank || actorRank < newRank) {
    throw new AppError(memberErrors.CANNOT_CHANGE_ROLE, 403, errorCode);
  }
}
```

### Common member and invitation exceptions

- `MEMBER.ERRORS.CANNOT_CHANGE_ROLE` — Actor lacks rank to change the target's role.
- `MEMBER.ERRORS.CANNOT_REMOVE_SELF` — A member cannot remove themselves via the workspace member management flow.
- `MEMBER.ERRORS.CANNOT_REMOVE_OWNER` — Only another owner can remove an owner.
- `MEMBER.ERRORS.NOT_MEMBER` — The requesting user is not a member of the workspace.
- `MEMBER.ERRORS.INVALID_ROLE` — The supplied role is not a known workspace role.
- `INVITATION.ERRORS.CANNOT_MANAGE_INVITATIONS` — The actor does not have permission to manage invitations.

### Defense in depth

Even when a route already gates an action by permission, the service may repeat the critical business-rule check. This protects the domain from future route changes, internal callers, and test shortcuts.
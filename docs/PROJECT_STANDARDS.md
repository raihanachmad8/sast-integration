# Project Standards

## Application Shape

```text
src/
├── app/            # Next.js App Router — routing & layouts only
├── features/       # UI feature modules (components, hooks, state)
├── modules/        # Client-side data modules (API clients, queries)
├── server/         # Backend logic (services, repositories, schemas)
├── commons/        # Shared constants, types, permissions
├── components/     # Shared UI components
│   └── shared/     # Reusable primitives (PageHeader, DataTable, PermissionGate, etc.)
├── lib/            # Shared utilities, hooks, and integrations
│   ├── utils/      # Pure helpers (getInitials, formatDate, roleLabel)
│   ├── hooks/      # Shared hooks (useDebouncedValue, useTableParams, useBreakpoint, useConfirm)
│   ├── api/        # API error utilities (ApiRequestError, parseApiResponse)
│   ├── ai/         # AI model integrations
│   ├── scanner/    # Scanner engine integrations
│   ├── scm/        # Source control integrations
│   └── permissions/# Permission logic (legacy — prefer lib/hooks/usePermissions)
└── config/         # App configuration & env validation
```

| Directory | Responsibility | Rule |
|-----------|---------------|------|
| `app/` | Routing, layouts, metadata | No business logic |
| `features/` | Feature UI & local state | Self-contained per feature |
| `modules/` | Client data access | Query hooks + API client calls |
| `server/` | Backend business logic | Never imported from client code |
| `commons/` | Shared across features | Constants, types, permissions only |
| `components/shared/` | Reusable UI primitives | No feature-specific logic |
| `lib/utils/` | Stateless pure helpers | No side effects, no React |
| `lib/hooks/` | Shared React hooks | Must be `'use client'` |
| `lib/api/` | API client utilities | Error handling, response parsing |

---

## Feature Module Pattern

### Shared Features (reusable across pages)

```text
features/
└── scan-results/
    ├── components/
    │   ├── scan-results-table.tsx
    │   ├── vulnerability-card.tsx
    │   └── index.ts
    ├── hooks/
    │   └── use-scan-filters.ts
    ├── constants.ts
    ├── types.ts
    └── index.ts
```

### Page-Local Components (_components/)

For complex pages, extract sub-components into a `_components/` directory:

```text
app/(authenticated)/[workspace]/members/
├── _components/
│   ├── MembersTabBar.tsx
│   ├── MembersTable.tsx
│   ├── InvitationsTable.tsx
│   ├── ChangeRoleModal.tsx
│   ├── InviteMemberModal.tsx
│   └── MemberSummaryCards.tsx
└── page.tsx              # Orchestration only (~80 lines)
```

Rules:
- `_components/` is NOT a route (underscore prefix excluded by Next.js)
- Each file exports a single component
- `page.tsx` only composes — no inline table/modal logic
- Extract when a page exceeds ~150 lines of JSX

### General Rules

- Each feature is a self-contained directory
- Export public API via index.ts
- Feature-specific types stay in the feature
- Shared types go to commons/types/

---

## Shared Components

Reusable UI primitives live in `src/components/shared/`:

| Component | Purpose | Usage |
|-----------|---------|-------|
| `PageHeader` | Title + description + actions + breadcrumbs | Every page header |
| `DataTable` | Ant Design Table with sort, pagination | Data-heavy tables |
| `LoadingState` | Spinner/skeleton (4 variants) | All loading states |
| `EmptyState` | Empty state with icon + action | No-data states |
| `ErrorState` | Error display with retry | Page-level errors |
| `ErrorBoundary` | Catches component errors | Wrap risky components |
| `FilterControl` | Search + filter dropdowns + active tags | DataTable filter UI |
| `ConfirmDialog` | Consistent confirm dialogs | Destructive actions |
| `StatusPill` | Ant Design Tag for status | Status/role badges |
| `Toolbar` | Flex layout for search + actions | DataTable headers |
| `PermissionGate` | Conditional render by permission | Role-based UI |
| `Can` | Render-prop permission check | Advanced permission logic |
| `FaIcon` | Font Awesome icon renderer | All FA icons |

**Rules:**
- Always use `LoadingState` instead of raw `<Spin>`
- Always use `EmptyState` instead of custom empty divs
- Always use `PageHeader` instead of manual h1 + p layouts
- Always use `FilterControl` instead of manual search + filter UI
- Always use `ConfirmDialog` (via `useConfirm` hook) for destructive actions
- Use `PermissionGate` / `Can` instead of manual `isManager` / `isOwner` checks

---

## Permission System

### Roles (Hierarchy: owner > manager > reviewer > member)

| Role | Description |
|------|-------------|
| `owner` | Full workspace control |
| `manager` | Manage members, projects, scans |
| `reviewer` | Triage findings, run scans |
| `member` | View-only access |

### Using Permissions

```tsx
// Hook — programmatic checks
const { has, isAtLeast, role } = usePermissions();

if (has(PERMISSION.MEMBER_INVITE)) { /* ... */ }
if (isAtLeast(ROLE.MANAGER)) { /* ... */ }

// Component — declarative rendering
<PermissionGate permission={PERMISSION.MEMBER_INVITE}>
  <InviteButton />
</PermissionGate>

<PermissionGate minRole={ROLE.MANAGER} fallback={<UpgradeHint />}>
  <AdminPanel />
</PermissionGate>

// Render-prop — advanced
<Can permission={PERMISSION.FINDING_TRIAGE}>
  {({ has, isAtLeast }) => (
    <div>
      {has(PERMISSION.FINDING_OVERRIDE_AI) && <OverrideBtn />}
      {isAtLeast(ROLE.OWNER) && <DeleteBtn />}
    </div>
  )}
</Can>
```

### Constants Location

- `commons/constants/permissions.ts` — ROLE, PERMISSION, ROLE_PERMISSIONS, RESOURCES, ACTIONS
- `lib/utils/roleLabel.ts` — ROLE_LABELS, ROLE_PILL_CLASS, ASSIGNABLE_ROLES, ROLE_HELP, roleLabel(), formatFieldLabel()
- `lib/hooks/usePermissions.ts` — usePermissions() hook

---

## Data Flow

```
Page (app/) → Feature UI (features/) → Query Hook (modules/) → Client API → API Route (app/api/) → Service (server/) → Repository (server/) → Database
                                                                                               ↓
                                                                                         Queue (pg-boss)
                                                                                               ↓
                                                                                           Worker → Parser → Finding Service → DB
                                                                                               ↓
                                                                                       Storage (Local/S3/Cloudinary)
```

| Layer | File Location | Responsibility |
|-------|--------------|----------------|
| Page | `app/**/page.tsx` | Compose features, fetch data |
| Feature UI | `features/*/` | Render UI, handle interactions |
| Query Hook | `modules/*/queries/` | TanStack Query cache layer |
| Client API | `modules/*/api/` | HTTP calls to API routes |
| API Route | `app/api/v1/**/` | Validate input, call service |
| Service | `server/*/services/` | Business logic orchestration |
| Repository | `server/*/repositories/` | Database queries (Drizzle) |
| Database | PostgreSQL | Data persistence |
| Queue | `server/modules/queue/` | Background job processing (pg-boss) |
| Worker | `server/modules/queue/jobs/` | Async job handlers (parse, AI verify, cleanup) |
| Storage | `server/modules/storage/` | File storage (Local/S3/Cloudinary) |

---

## Server Module Pattern

```text
server/
└── scans/
    ├── services/
    │   └── scan.service.ts
    ├── repositories/
    │   └── scan.repository.ts
    ├── schemas/
    │   └── scan.schema.ts
    └── index.ts
```

Rules:
- Services contain business logic, call repositories
- Repositories are the only layer that touches the database
- Schemas define Zod validation for input/output
- Never call a repository directly from an API route

---

## API Response Standard

All API responses follow this envelope:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  };
}
```

Success example:

```json
{ "success": true, "message": "Scans retrieved", "data": [...], "meta": { "page": 1, "limit": 20, "total": 45 } }
```

Error example:

```json
{ "success": false, "message": "Scan not found", "data": null }
```

---

## Error Handling

```typescript
// Base error
class AppError extends Error {
  constructor(public statusCode: number, message: string, public code?: string) {
    super(message);
  }
}

// Specific errors
class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super(401, 'Unauthorized', 'UNAUTHORIZED');
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}
```

All errors are caught by a global error handler in API routes and returned using the standard envelope.

---

## Testing Strategy

See [TESTING.md](./TESTING.md) for complete testing standards and conventions.

- **Unit**: Services & utilities (Vitest) — `pnpm test`
- **Integration**: API routes with test database — `pnpm test:e2e`
- **E2E**: Critical user flows (Playwright) — `pnpm test:ui`
- **Coverage target**: Lines ≥ 80% for `src/server/modules/**/*.ts`

---

## GitHub Collaboration Standards

This project follows a **spec-driven, high-signal** approach to GitHub Issues and Pull Requests.

### Philosophy

- **Issues** = Technical specifications and planning artifacts (not simple todo lists).
- **Pull Requests** = Implementation records with evidence.
- We prioritize **clarity and reviewability** over speed.

### Required Issue Structure (Features & Enhancements)

All non-trivial issues should follow this structure (see examples: #22, #23):

1. **Objective** — One clear sentence.
2. **Scope** — Detailed deliverables (use tables for APIs).
3. **Out of Scope** — Explicit boundaries.
4. **Acceptance Criteria** — Checkboxes (`[ ]` / `[x]`).
5. **Technical Notes** — Architecture, files, business rules.
6. **Verification** — Build, lint, test counts, docs updates.
7. **Git & PR** — Branch + linked PR.

See full template and rules in [CONTRIBUTING.md](../CONTRIBUTING.md#issue-standards-highly-recommended).

### Pull Request Expectations

- Follow Conventional Commit title style.
- Use the PR description template from `CONTRIBUTING.md`.
- Always link the originating issue (`Closes #xx`).
- Provide testing evidence with specific numbers and file names.
- Keep changes focused and reviewable.

### Labels & Milestones

- Use labels consistently: `enhancement`, `bug`, `backend`, `frontend`, `breaking`, `docs`.
- Major releases are tracked via milestones (e.g., "Workspace Management v0.4.0").
- Close issues only when **all** acceptance criteria are verified.

This standard ensures that future contributors (and AI assistants) can understand the intent, scope, and verification criteria of every piece of work.
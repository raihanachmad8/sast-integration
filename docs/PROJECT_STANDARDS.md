# Project Standards

## Application Shape

```text
src/
├── app/            # Next.js App Router — routing & layouts only
├── features/       # UI feature modules (components, hooks, state)
├── modules/        # Client-side data modules (API clients, queries)
├── server/         # Backend logic (services, repositories, schemas)
├── commons/        # Shared UI components, constants, types, schemas
│   ├── components/ # Shared UI components (DataTable, FaIcon, etc.)
│   │   └── layout/ # Layout components (AppShell, SidebarNav, etc.)
│   ├── providers/  # React providers (QueryProvider, AntdProvider)
│   ├── constants/  # App-wide constants (tokens, routes, etc.)
│   ├── types/      # Shared TypeScript types
│   └── schemas/    # Zod validation schemas
├── lib/            # Third-party integrations (drizzle, redis, queue)
│   └── hooks/      # Custom React hooks (useWorkspace, useDataTable, etc.)
├── utils/          # Pure helper functions
└── config/         # App configuration & env validation
```

| Directory | Responsibility | Rule |
|-----------|---------------|------|
| `app/` | Routing, layouts, metadata | No business logic |
| `features/` | Feature UI & local state | Self-contained per feature |
| `modules/` | Client data access | Query hooks + API client calls |
| `server/` | Backend business logic | Never imported from client code |
| `commons/` | Shared across features | No feature-specific code |
| `commons/components/` | Shared UI components | Used by all features |
| `commons/providers/` | React context providers | App-wide providers only |
| `lib/` | External service wrappers | Thin adapters only |
| `lib/hooks/` | Custom React hooks | Reusable across features |
| `utils/` | Stateless helpers | No side effects |

---

## Feature Module Pattern

```text
features/
└── scan/
    ├── ScanTable.tsx
    ├── ScanDetailDrawer.tsx
    ├── ScanTimeline.tsx
    ├── NewScanModal.tsx
    ├── FindingItem.tsx
    ├── types.ts          # Feature-specific types
    └── index.ts          # Public API exports
```

Rules:
- Each feature is a self-contained directory
- Export public API via index.ts
- Feature-specific types stay in the feature (e.g., `features/scan/types.ts`)
- Feature-specific components stay in the feature (e.g., `features/auth/components/`)
- Shared types go to `commons/types/`
- Shared UI components go to `commons/components/`

---

## Type Naming Conventions

When multiple types exist for the same entity, use context-specific names to avoid confusion:

| Type Name | Location | Purpose |
|-----------|----------|---------|
| `FindingRow` | `commons/types/findings.ts` | DB model mirror |
| `FindingExtended` | `commons/types/findings.ts` | List view with joins |
| `FindingGroup` | `commons/types/findings.ts` | Deduplicated finding |
| `ScanFinding` | `features/scan/types.ts` | Scan-specific (rich AI analysis) |
| `Finding` | `commons/types/domain.ts` | Unified cross-feature type |

Rules:
- Prefix feature-specific types with the feature name (e.g., `ScanFinding`, not just `Finding`)
- Add JSDoc explaining when to use each variant
- Prefer `FindingRow`/`FindingExtended` from commons for most use cases
- Use `ScanFinding` only for scan detail/parsing components

---

## Data Flow

```
Page (app/) → Feature UI (features/) → Query Hook (modules/) → Client API → API Route (app/api/) → Service (server/) → Repository (server/) → Database
```

| Layer | File Location | Responsibility |
|-------|--------------|----------------|
| Page | `app/**/page.tsx` | Compose features, fetch data |
| Feature UI | `features/*/` | Render UI, handle interactions |
| Query Hook | `modules/*/queries.ts` | TanStack Query cache layer |
| Client API | `modules/*/api.ts` | HTTP calls to API routes |
| API Route | `app/api/v1/**/` | Validate input, call service |
| Service | `server/modules/*/services/` | Business logic orchestration |
| Repository | `server/modules/*/repositories/` | Database queries (Drizzle) |
| Database | PostgreSQL | Data persistence |

---

## Server Module Pattern

```text
server/
└── modules/
    └── scan/
        ├── services/
        │   └── managed-scan.service.ts
        ├── repositories/
        │   └── scan.repository.ts
        ├── parsers/
        │   └── semgrep.parser.ts
        └── scanners.ts
```

Rules:
- Services contain business logic, call repositories
- Repositories are the only layer that touches the database
- Schemas define Zod validation for input/output
- Never call a repository directly from an API route

---

## AI Verification Pattern

The AI verification pipeline follows this flow:

```
Finding → Build CWE Context → Construct Prompt → Call LLM → Parse Response → Store Verification
```

### CWE Context Enrichment

Knowledge base entries (global, not workspace-scoped) provide context to the LLM:

```typescript
// ai-verification.service.ts
const cweContext = await this.buildCweContext(finding.cweId);
// Returns: "CWE Knowledge (CWE-787 - Out-of-bounds Write): Description: ... Severity: ... Remediation: ..."
```

### Prompt Templates

Two prompt variants exist (same JSON response format):
- **strict** — Detailed explanation, data flow analysis
- **balanced** — Brief explanation only

Both use the same system prompt with strict rules:
- Default assumption: scanner is CORRECT (true_positive)
- Only classify as false_positive with PROOF of safety
- If unsure → true_positive

### Response Format

```typescript
interface AiModelResponse {
  verdict: 'true_positive' | 'false_positive';
  confidence: number;        // 0-1
  explanation: string;
  dataFlow?: string;         // source → sink path
  taintSource?: string;      // untrusted input origin
  matchDetail?: string;      // what scanner found
  likelyCwe?: string[];      // CWE predictions
  fixSuggestion?: string;
  rawResponse?: string;      // for debugging
}
```

---

## Comment System Pattern

Comments are backed by the `comments` table and exposed via:

```
GET  /api/v1/workspaces/:wid/findings/:fid/comments
POST /api/v1/workspaces/:wid/findings/:fid/comments
```

Frontend uses:
- `useCommentsQuery(findingId)` — fetches comments
- `useAddCommentMutation(findingId)` — adds a comment

Both are in `modules/findings/queries.ts` and exported via `modules/findings/index.ts`.

---

## Modal Pattern

All modals must use:
- `destroyOnHidden` prop to reset form state
- `initialValues` on `<Form>` for data population
- No `useEffect` for `form.setFieldsValue`

```tsx
<Modal destroyOnHidden title="Edit" open={open} onOk={handleSave}>
  <Form initialValues={{ name: item.name }}>
    <Form.Item name="name"><Input /></Form.Item>
  </Form>
</Modal>
```

---

## React Query Pattern

All queries follow this structure:

```typescript
// hooks file
export function useXxxQuery(params) {
  return useQuery({
    queryKey: moduleKeys.xxx(params),
    queryFn: () => moduleApi.xxx(params),
    staleTime: STALE.DEFAULT,
    enabled: !!requiredParam,
  });
}

export function useXxxMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars) => moduleApi.xxx(vars),
    onSuccess: () => qc.invalidateQueries({ queryKey: moduleKeys.all }),
  });
}
```

Rules:
- Query keys centralized in `keys.ts`
- Use `STALE.*` constants, never raw numbers
- Use `keepPreviousData` for paginated lists
- All hooks must have JSDoc with @param and @example

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

- **Unit**: Services & utilities (Vitest)
- **Integration**: API routes with test database
- **E2E**: Critical user flows (Playwright)
- **Coverage target**: 80% for server modules

See [TESTING.md](./TESTING.md) for detailed testing standards.

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
- Major releases are tracked via Milestones (e.g., "M4: v0.4.0 - Workspace Management").
- Close issues only when **all** acceptance criteria are verified.

This standard ensures that future contributors (and AI assistants) can understand the intent, scope, and verification criteria of every piece of work.
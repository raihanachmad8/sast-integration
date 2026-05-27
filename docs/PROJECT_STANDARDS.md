# Project Standards

## Application Shape

```text
src/
├── app/            # Next.js App Router — routing & layouts only
├── features/       # UI feature modules (components, hooks, state)
├── modules/        # Client-side data modules (API clients, queries)
├── server/         # Backend logic (services, repositories, schemas)
├── commons/        # Shared UI components, constants, types
├── lib/            # Third-party integrations (drizzle, redis, queue)
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
| `lib/` | External service wrappers | Thin adapters only |
| `utils/` | Stateless helpers | No side effects |

---

## Feature Module Pattern

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

Rules:
- Each feature is a self-contained directory
- Export public API via index.ts
- Feature-specific types stay in the feature
- Shared types go to commons/types/

---

## Data Flow

```
Page (app/) → Feature UI (features/) → Query Hook (modules/) → Client API → API Route (app/api/) → Service (server/) → Repository (server/) → Database
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

> **Status**: Placeholder — to be defined in v0.2.0

Planned approach:
- **Unit**: Services & utilities (Vitest)
- **Integration**: API routes with test database
- **E2E**: Critical user flows (Playwright)
- **Coverage target**: 80% for server modules
# Coding Conventions

**Purpose**: This document defines the consistent coding standards used throughout the SAST Integration codebase to ensure maintainability, readability, and alignment with the project's architectural principles.

## Naming

- **Language**: English only for code, comments, and variable names
- **Files**: kebab-case.ts / kebab-case.tsx
- **Components**: PascalCase (e.g., ScanResultsTable)
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types/Interfaces**: PascalCase (e.g., ScanResult, CreateScanInput)
- **Enums**: PascalCase name, UPPER_SNAKE_CASE values

## File Name Examples

```text
scan-results-table.tsx      # Component
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
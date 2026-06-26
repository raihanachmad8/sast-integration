# Test Audit & Redesign Specification

**Date:** 2026-06-26
**Scope:** Full audit and rewrite of all unit, E2E API, and E2E UI tests
**Standard:** Enterprise production — no fakes, no workarounds, accurate assertions

---

## Problem Statement

The SAST Integration application is feature-complete, but the test suite has degraded:

1. **Fake tests** — Tests that assert on mock return values instead of real service behavior (e.g., `finding.service.test.ts` mocks `updateAssignment` to return `{ assignedTo: 'user-456' }` then asserts `result.assignedTo === 'user-456'`)
2. **Missing coverage** — Critical methods with zero tests: `replaceFindingsForScanJob` (110+ lines, transactional dedup), `updateVerdict`, `authService.invite`, `authService.acceptInvite`, `authService.acceptInviteForLoggedInUser`
3. **Overly permissive assertions** — E2E tests accept 2-4 different HTTP status codes for deterministic scenarios (e.g., signup accepts `[200, 403, 409, 429]`)
4. **UI tests masking real behavior** — Signin spec mocks API to return 400 instead of real 401 to avoid interceptor redirect; tests never exercise real error handling
5. **Dead tests** — Tests for functionality that no longer exists or has changed significantly
6. **No coverage enforcement** — `@vitest/coverage-v8` installed but zero configuration
7. **No test isolation** — E2E API tests assume a server is already running at `localhost:3000`

## Design Principles

### Test Naming Convention

Every test file follows this structure:

```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    describe('✅ positive (happy path)', () => {
      it('should [expected behavior] when [valid condition]', () => {})
    })
    describe('❌ negative (error path)', () => {
      it('should throw [ErrorType] when [invalid condition]', () => {})
    })
    describe('🔲 edge cases', () => {
      it('should handle [boundary condition]', () => {})
    })
  })
})
```

**Every method MUST have both positive and negative test cases.** A test file with only happy-path tests is incomplete.

### Mock Policy (Strict)

- **Mock only external dependencies:** repositories, database, email service, file storage, logger
- **Never mock the code under test**
- **Never assert on mock return values** — assert on: correct arguments passed to mocks, service return shape, thrown errors
- **Use shared factories** for consistent mock data shapes (`tests/helpers/factories.ts`)

### Dead Test Detection

For every test file, verify:
- Does the tested method still exist in the source code?
- Does the test's expected behavior match the current implementation?
- Are the error constants still valid?
- Are the API response shapes still current?

**If a test tests functionality that no longer exists → delete it.**
**If a test's expectations are outdated → rewrite it.**

---

## Wave 1: Fix Worst Offenders

### 1a. `finding.service.test.ts` — Eliminate Fake Tests

**Current:** 20+ tests, most assert on mock return values (Anti-Pattern 1).

**Rewrite to ~30-35 tests with clear + / - / edge structure:**

```
list:
  ✅ return paginated findings with correct shape
  ✅ pass filters to repository when filters provided
  ✅ use default pagination when none specified
  ❌ throw UnauthorizedError when user has no workspace access
  🔲 return empty array when no findings match

getById:
  ✅ return finding with all fields when found
  ✅ include AI verdict data when available
  ✅ include scanner details when available
  ❌ throw NotFoundError when finding does not exist
  ❌ throw UnauthorizedError when user lacks access

assign:
  ✅ call updateAssignment with findingId and userId
  ✅ return updated finding with assignedTo populated
  ✅ unassign when userId is null
  ❌ throw NotFoundError when finding does not exist
  ❌ throw error when repository fails
  🔲 allow reassigning to different user
  🔲 allow assigning to same user (idempotent)

updateStatus:
  ✅ update group status to resolved
  ✅ update group status to dismissed
  ✅ update group status to in_progress
  ❌ throw NotFoundError when group does not exist
  ❌ throw error when repository fails

replaceFindingsForScanJob (currently 0 tests):
  ✅ create finding groups and findings for new scan job
  ✅ replace existing findings when scan job already has findings
  ✅ deduplicate findings with same fingerprint
  ❌ throw when scan job ID is invalid
  ❌ throw when repository transaction fails
  🔲 handle empty findings array without error
  🔲 handle findings with null optional fields

updateVerdict (currently 0 tests):
  ✅ update verdict and trigger PR comment when applicable
  ✅ update verdict without PR comment when not applicable
  ❌ throw NotFoundError when finding does not exist
  ❌ throw when verdict value is invalid
```

### 1b. `auth.service.test.ts` — Add Missing Methods

**Currently untested:** `invite`, `acceptInvite`, `acceptInviteForLoggedInUser`

```
invite:
  ✅ create invitation and send email for valid request
  ✅ return invitation with token and expiry
  ❌ throw ConflictError when invitation already exists
  ❌ throw UnauthorizedError when inviter not in workspace
  ❌ throw when email service fails
  🔲 allow re-invite to expired invitation

acceptInvite:
  ✅ create user and add to workspace for valid token
  ✅ return created user with workspace membership
  ❌ throw GoneError when invitation is expired
  ❌ throw GoneError when invitation already accepted
  ❌ throw NotFoundError when token is invalid
  🔲 handle invitation for user that already exists

acceptInviteForLoggedInUser:
  ✅ add existing user to workspace via invitation
  ✅ return membership details after acceptance
  ❌ throw GoneError when invitation email does not match user email
  ❌ throw GoneError when invitation is expired
  ❌ throw ConflictError when user already in workspace
```

### 1c. Dead Test Cleanup

For each existing test file, verify every tested method still exists in source. Remove tests for:
- Methods that have been renamed or removed
- Error paths that no longer apply
- API response shapes that have changed

---

## Wave 2: Missing Coverage & Thin Tests

### 2a. `scan.service.test.ts` — Complete Missing Methods

```
getById:
  ✅ return scan with all fields when found
  ✅ include repository name and status details
  ❌ throw NotFoundError when scan does not exist
  ❌ throw UnauthorizedError when user lacks access

getDetail (currently 1 thin test):
  ✅ return scan with timeline and scanner results
  ✅ deduplicate scanner results by engine name
  ✅ build timeline from status change events
  ❌ throw NotFoundError when scan does not exist
  ❌ throw UnauthorizedError when user lacks access
  🔲 handle scan with no scanner results
  🔲 handle scan with no timeline events

getScanResults (currently 0 tests):
  ✅ return paginated scan results
  ✅ include finding details with each result
  ❌ throw NotFoundError when scan does not exist

updateStatus (currently 0 tests):
  ✅ update scan status from pending to running
  ✅ update scan status from running to completed
  ✅ update scan status to failed with error details
  ❌ throw when invalid status transition attempted
  ❌ throw when scan not found
  🔲 handle concurrent status updates gracefully
```

### 2b. Error Path & Edge Case Pass (All Unit Test Files)

Every unit test file gets minimum 2 negative + 2 edge cases added:

| Category | What to add |
|----------|-------------|
| ❌ Repository throws | AppError thrown when repository throws unexpected error |
| ❌ Entity not found | NotFoundError when entity doesn't exist |
| ❌ Unauthorized | UnauthorizedError when user lacks permissions |
| 🔲 Null/undefined | Handling of null optional fields |
| 🔲 Empty collections | Behavior with empty arrays/maps |
| 🔲 Boundary values | At limits (max length, zero values) |

**Files to update:**
- `ai-models.service.test.ts`
- `knowledge-base.service.test.ts`
- `profile.service.test.ts`
- `quality-gates.service.test.ts`
- `scanner-engines.service.test.ts`
- `source-control-repository.service.test.ts`
- `storage.service.test.ts` + driver tests
- `team.service.test.ts`
- `webhook.service.test.ts`
- `member.service.test.ts`

### 2c. Coverage Configuration

Add to `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'lcov'],
  include: ['src/server/modules/**/*.ts'],
  exclude: ['src/server/modules/**/index.ts'],
  thresholds: {
    lines: 80,
    branches: 80,
    functions: 80,
    statements: 80,
  },
}
```

Add to `package.json`:
```json
"test:coverage": "vitest run --project unit --coverage",
"test:all": "vitest run --project unit --project e2e"
```

---

## Wave 3: E2E API Tests

### 3a. Self-Contained Test Server

Add global setup that starts the Next.js server before tests run:

```
tests/e2e/helpers/global-setup.ts
  - spawns `pnpm start` with NODE_ENV=test
  - waits for /api/v1/health to respond
  - exports teardown to kill server

vitest.config.ts e2e project
  - add setupFiles: ['./tests/e2e/helpers/global-setup.ts']
```

### 3b. Tighten Permissive Assertions

Replace multi-code assertions with exact codes:

```
Current:  expect([200, 403]).toContain(response.status)
Rewrite:  expect(response.status).toBe(200)  // positive case
          expect(response.status).toBe(403)  // negative case (separate test)
```

**Files to fix:**
- `auth/signup.test.ts` — `[200, 403]` and `[200, 403, 409, 429]` → separate tests
- `auth/signin.test.ts` — `[401, 429]` → separate rate-limiting test

### 3c. Add Negative Test Cases

Every E2E API test file gets:

```
❌ 401 when no auth token provided
❌ 403 when user lacks required permission
❌ 404 when entity does not exist
❌ 422 when request body is invalid
🔲 empty results when no data exists
🔲 pagination with large offset
```

---

## Wave 4: E2E UI Tests

### 4a. Remove Mock-Heavy Tests

Remove `page.route()` mocking for auth flows. Use real `signInAndOpenWorkspace` helper instead.

Replace signin spec's 400→401 workaround with real error handling test:

```typescript
// Test real 401 handling — if interceptor redirects instead of showing error, test catches the bug
it('should show error message on invalid credentials', async () => {
  await page.goto('/signin')
  await page.fill('input[type="email"]', 'wrong@example.com')
  await page.fill('input[type="password"]', 'wrongpassword')
  await page.click('button[type="submit"]')
  await expect(page.getByText(/invalid credentials|incorrect/i)).toBeVisible()
})
```

### 4b. Add Negative Test Cases to All UI Specs

```
❌ validation error when required field is empty
❌ validation error when input exceeds max length
❌ error toast when API returns 403 (no permission)
❌ error toast when API returns 409 (conflict)
🔲 disable submit button while request is in progress
🔲 handle network error gracefully
```

---

## Wave 5: Infrastructure & Shared Helpers

### 5a. Shared Test Factories

Create `tests/helpers/factories.ts`:

```typescript
export function createMockFinding(overrides?) { /* full Finding shape */ }
export function createMockUser(overrides?) { /* full User shape */ }
export function createMockWorkspace(overrides?) { /* full Workspace shape */ }
export function createMockScan(overrides?) { /* full Scan shape */ }
```

Reduces mock duplication across all unit tests. Every factory produces a complete entity shape matching the real database schema.

### 5b. Package.json Scripts

```json
"test": "vitest run --project unit",
"test:e2e": "vitest run --project e2e",
"test:ui": "playwright test",
"test:coverage": "vitest run --project unit --coverage",
"test:all": "vitest run --project unit --project e2e",
"test:watch": "vitest --project unit"
```

---

## Cross-Cutting: Dead Test Removal

Across ALL waves, before rewriting any test file:

1. Check every `describe` block's method name against the current source
2. Check every error constant against current `src/server/http/errors.ts`
3. Check every API response shape against current route handlers
4. Remove tests for removed/renamed functionality
5. Update tests whose expectations no longer match current behavior

---

## Scope Summary

| Wave | Focus | Est. Test Count | Risk |
|------|-------|-----------------|------|
| 1 | Fake tests + missing auth methods + dead tests | ~35 new/rewritten | HIGH — core security |
| 2 | Error paths + coverage config + all unit test edge cases | ~40 added | MEDIUM — breadth |
| 3 | E2E API self-contained + tighter assertions + negatives | ~30 rewritten/added | MEDIUM — server lifecycle |
| 4 | E2E UI real flows + remove mocks + negatives | ~25 rewritten/added | LOW |
| 5 | Shared factories + scripts | Infrastructure only | LOW |

**Total estimated:** ~130 new/rewritten tests across 65+ test files

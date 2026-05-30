# Testing Standards

**Purpose**: This document defines how we write tests in SAST Integration to ensure they are reliable, maintainable, and aligned with the project's professional development standards.

We treat tests as **first-class citizens** — they should be as clear and well-documented as production code.

---

## Core Principles

1. **Every test must have a clear purpose**
   - The test name + comments should answer: *Why does this test exist?*
   - Avoid vague names like "should work" or "test members".

2. **Tests must be resilient to shared state**
   - Our E2E tests (especially Playwright) run against a persistent database.
   - Never assume the database is in a "clean" state unless the test itself created that state.

3. **Prefer behavior-driven test names**
   - Good: `should prevent owner from removing themselves`
   - Bad: `test remove button`

4. **Document complex logic**
   - Helpers and non-obvious test flows must have JSDoc or clear comments explaining *why*.

---

## Test File Structure

### Describe Blocks

Use `test.describe` to group related tests. Add a top-level comment explaining the scope of the group.

```ts
/**
 * E2E UI tests for the Members management page.
 *
 * Covers member listing, role management, and invitation workflows.
 */
test.describe('Members Page', () => {
  ...
});
```

### Individual Test Cases

Every non-trivial test should have a short comment block explaining its purpose.

```ts
/**
 * Purpose: Verify that the owner cannot remove themselves from the workspace.
 *
 * This is a critical security rule.
 */
test('should not show remove button for owner row', async ({ page }) => {
  ...
});
```

---

## Handling Shared State (E2E Tests)

This is the **most common source of flaky tests** in this project.

### Rules

- **Never** write a test that blindly expects "no data" (e.g. "No pending invitations") unless the test itself guarantees a clean state.
- When testing creation flows, **first check existing state** before asserting creation success.
- Prefer creating fresh users when possible (especially in `MULTIPLE` mode).
- In `SINGLE` mode, defensive checks are almost always required.

**Good Example** (from `workspace.test.ts`):

```ts
const existingPersonal = ...filter personal workspaces;

if (existingPersonal.length >= 1) {
  // Goal already satisfied due to previous runs
  expect(existingPersonal).toHaveLength(1);
  return;
}

const res = await createPersonalWorkspace();
expect(res.status).toBe(201);
```

---

## Naming Conventions

| Type                  | Recommended Pattern                              | Example |
|-----------------------|--------------------------------------------------|--------|
| **API Test**          | `should <action> when <condition>`               | `should return 409 when personal workspace already exists` |
| **UI Test**           | `should <show / allow / prevent> <behavior>`     | `should not show remove button for owner row` |
| **Helper Function**   | Describe what it does + why it exists            | `signInAndGoToMembers` |
| **Complex Test**      | Add detailed JSDoc explaining the scenario       | See examples in workspace tests |

---

## JSDoc Requirements

### Required for:

- All test helper functions
- Any `test.describe` block that is not self-explanatory
- Individual `test()` / `it()` that has non-obvious logic or mode branching

### Recommended Format

```ts
/**
 * Purpose: <One clear sentence>
 *
 * This test validates:
 * - Point 1
 * - Point 2
 *
 * Notes:
 * - Any important caveats (e.g. shared state, mode differences)
 */
```

---

## Mode-Aware Testing (`WORKSPACE_MODE`)

Many tests must behave differently depending on `single` vs `multiple` mode.

**Best Practice**:
- Check the mode early in the test.
- Clearly document the expected behavior for each mode.
- Prefer early `return` after handling one mode rather than deeply nested if/else.

Example pattern:

```ts
const config = await getConfig();

if (config.workspaceMode === WORKSPACE_MODE.SINGLE) {
  // Single mode expectations...
  return;
}

// Multiple mode expectations...
```

---

## Anti-Patterns to Avoid

| Anti-Pattern                        | Why It's Bad                              | Better Approach |
|-------------------------------------|-------------------------------------------|-----------------|
| Asserting exact "No X" empty state  | Breaks when other tests leave data        | Assert that the UI element for the tab loaded |
| Hard `toHaveCount(1)` without check | Fails on repeated runs                    | Check current state first |
| Vague test names                    | Hard to understand failure reason         | Use behavior-driven names |
| No comments on complex helpers      | Future developers (or AI) will struggle   | Add JSDoc |
| Creating data without isolation     | Test pollution across runs                | Use unique emails or defensive checks |

---

## Recommended Reading

- [CONTRIBUTING.md](../CONTRIBUTING.md) — Especially the sections on Issue & PR standards (the same clarity mindset applies to tests).
- [docs/PROJECT_STANDARDS.md](./PROJECT_STANDARDS.md)

---

**Last Updated**: May 2026

This document should evolve as we learn better patterns for writing reliable tests in this environment.
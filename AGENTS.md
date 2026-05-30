# AGENTS.md — Project Rules for AI Agents

This document sets the mandatory standards for any AI working in this repository.  
All output must match or exceed the quality of the highest-standard work produced in this project (#22, #23, and their PRs).

---

## Golden Rules

These 6 rules are non-negotiable. Breaking any of them is unacceptable.

1. **GitHub is the specification.** Every Issue and PR must follow the exact structure defined in `.github/ISSUE_TEMPLATE/` and `PULL_REQUEST_TEMPLATE/`.
2. **Use `[X]` only.** All completed checklist items must use capital `[X]`. Never use `[x]`, emoji, or other variants.
3. **Every test requires a Purpose.** If you cannot clearly state the purpose of a test in one sentence, do not write the test.
4. **Handle all four states.** Every UI must explicitly handle Loading, Empty, Error, and Success. Never return `null` or raw `<Spin />`.
5. **Follow existing patterns.** Do not invent new patterns unless you can strongly justify it in the Technical Notes section.
6. **Zero technical debt comments.** `TODO`, `FIXME`, and "fix later" comments are forbidden in committed code.

When in doubt, re-read `docs/TESTING.md`, `docs/UI_UX_GUIDELINES.md`, and `docs/PROJECT_STANDARDS.md`.

---

## GitHub Collaboration Standards

Issues and Pull Requests are treated as **technical specifications**, not tickets.

### Mandatory Structure

**Issues** must follow `.github/ISSUE_TEMPLATE/feature.yml`:
- Objective
- Scope
- Out of Scope
- Acceptance Criteria
- Technical Notes
- Verification
- Git & PR Information

**Pull Requests** must follow `.github/PULL_REQUEST_TEMPLATE/default.md`:
- Summary
- Related Issue (with `Closes #XX`)
- Changes
- Testing & Verification
- Checklist
- Additional Notes

**Rules:**
- Never submit or update an Issue or PR without using the required structure.
- All completed items must use `[X]`.
- Behavior-driven language is required.

---

## Testing Standards

Follow `docs/TESTING.md`.

**Requirements:**
- Every test must have a clear, explicit **Purpose** comment.
- E2E and integration tests must be resilient to shared database state.
- Test names must describe observable behavior.

**Forbidden:**
- Tests that depend on execution order
- Assumptions of clean or empty state
- Brittle assertions based on previous test side effects

---

## UI/UX & Component Standards

Follow `docs/UI_UX_GUIDELINES.md`.

**Non-negotiable rules:**
- Always implement all four states (Loading, Empty, Error, Success).
- Only use the shared components: `LoadingState`, `EmptyState`, `ErrorState`.
- `AuthenticatedShell` must never return a blank state during loading or auth checks.
- Raw `<Spin />` is forbidden in application code.

---

## Code Quality & Documentation

- All public functions (especially services and repositories) **must** have high-quality JSDoc with `@throws` annotations where relevant.
- Non-obvious logic requires a "Purpose" comment.
- When in doubt, match the quality and style of the best files from the M4 era (#22, #23, #25, #27).

---

## Security & Authentication

The following patterns are established and must be respected:

- Refresh token rotation with reuse detection is active and must be preserved.
- `/auth/refresh` **requires** the `x-refresh-request: 1` header.
- Signup must remain neutral on duplicate emails.
- Changes to auth/session logic require updated tests and documentation.

---

## Commit & Branch Standards

- Use **Conventional Commits**.
- Branch from `dev` using `feature/*`, `fix/*`, or `docs/*`.
- Keep commits focused and atomic.

---

## Next.js Rules

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

## What Is Forbidden

- Bypassing established patterns for speed
- Writing flaky tests due to shared state
- Leaving `TODO` / `FIXME` / "fix later" comments
- Submitting PRs with weak context or poor structure
- Creating new loading/empty/error states instead of using shared components
- Treating this document as optional

---

## Required Reading

Before making non-trivial changes, you must be familiar with:

- `docs/TESTING.md`
- `docs/UI_UX_GUIDELINES.md`
- `docs/PROJECT_STANDARDS.md`
- `CONTRIBUTING.md`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/PULL_REQUEST_TEMPLATE/default.md`

---

## Maintenance

This is a living document. When new conventions are established or existing rules are frequently broken, you are required to propose updates to this file.

**Last Updated:** 2026-05-30

---

**Quality Bar:** All AI-generated work must be indistinguishable from — or better than — the standard set in Issues #22 and #23 and their PRs.

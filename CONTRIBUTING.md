# Contributing

This document defines how we work together in this repository. We value **clarity, consistency, and professionalism** in planning, implementation, and documentation.

---

## Branch Strategy

| Branch              | Purpose                          | Base   | Merge Strategy     |
|---------------------|----------------------------------|--------|--------------------|
| `main`              | Production / stable releases     | —      | Protected          |
| `dev`               | Active development               | `main` | Squash merge       |
| `feature/*`         | New features & enhancements      | `dev`  | Squash merge       |
| `fix/*`             | Bug fixes                        | `dev`  | Squash merge       |
| `hotfix/*`          | Critical production fixes        | `main` | Direct to `main`   |
| `release/vX.X.X`    | Release preparation & hardening  | `dev`  | Merge to `main`    |

---

## Git Workflow

1. Create branch from `dev`:
   ```bash
   git checkout -b feature/workspace-members
   ```
2. Commit using [Conventional Commits](#commit-format).
3. Push and open a **Draft PR** early for visibility.
4. Mark PR as **Ready for Review** when complete.
5. Squash merge into `dev` after approval.
6. For releases: create `release/vX.X.X` → merge to `main` → tag.

---

## Commit Format

We follow Conventional Commits:

```
type(scope): short description

[optional body]
```

**Allowed Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`, `build`

**Examples:**
```
feat(workspace): add member role change endpoint
fix(auth): prevent token refresh race condition
docs(api): document workspace invitation endpoints
```

---

## Code Style & Quality

- TypeScript strict mode enabled
- ESLint + Prettier (Next.js configuration)
- 2-space indentation, single quotes, no semicolons
- All new code must pass `pnpm lint` and `pnpm build`
- Unit tests required for services and complex business logic
- Playwright E2E tests required for critical user flows

---

## Testing Standards

We treat tests as first-class citizens. All tests must follow the standards defined in:

**[docs/TESTING.md](docs/TESTING.md)**

Key principles:
- Every test must have a **clear, documented purpose**.
- E2E tests must be **resilient to shared database state** (we do not reset the DB between runs).
- Prefer **behavior-driven test names** over vague ones.
- Complex helpers and non-obvious tests must have **JSDoc / comments** explaining *why* they exist.

Please read `docs/TESTING.md` before writing new E2E or integration tests.

---

## Issue Standards (Highly Recommended)

We treat GitHub Issues as **technical specifications**, not simple tickets.

### Recommended Structure for Feature / Enhancement Issues

Use the following template for consistency:

```markdown
## Objective

One clear sentence describing the goal.

## Scope

- Detailed breakdown of what will be delivered
- Use tables for API endpoints when applicable
- List UI components, services, repositories, etc.

## Out of Scope

- Explicit boundaries (what we are **not** doing)

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] ...

## Technical Notes

- Key architectural decisions
- New files and their responsibilities
- Business rules and edge cases
- Reused components / existing patterns

## Verification

- [ ] Build passes
- [ ] Lint: 0 errors
- [ ] Unit tests: X passed (mention new tests)
- [ ] Playwright E2E: X new tests
- [ ] API documentation updated (if applicable)
- [ ] Manual testing notes (optional)

## Git & PR

**Branch:** `feature/xxx`  
**Base:** `dev`  
**Target PR:** #xxx
```

### Rules

- Write issues **before** starting major work.
- Keep issues focused. One major feature = one issue.
- Use labels: `enhancement`, `bug`, `backend`, `frontend`, `breaking`, etc.
- Link issues to Milestones when part of a larger release.
- Close issues only when **all** acceptance criteria are met and verified.

---

## Pull Request Standards

### PR Title

Follow conventional commit style:
- `feat(workspace): implement member management API + UI`
- `fix(auth): resolve refresh token race condition`

### PR Description (Required Structure)

```markdown
## Summary

Brief description of what this PR delivers.

## Changes

- Bullet list of major changes
- Link to related issue: Closes #23

## Testing

- [ ] Build passes
- [ ] Lint clean
- [ ] Unit tests: X passed (Y new)
- [ ] Playwright: X new tests
- [ ] Manual verification notes

## Screenshots / Recordings (UI changes)

[Add when relevant]

## Checklist

- [ ] Self-review completed
- [ ] Relevant documentation updated
- [ ] No sensitive data committed
```

### PR Guidelines

- Keep PRs reasonably sized (ideally < 800 lines changed when possible).
- Always reference the related issue (`Closes #23` or `Ref #23`).
- Include testing evidence (numbers + specific test names).
- Update API documentation (`docs/api/`) when changing endpoints.
- Request review only when the PR is ready and CI is green.

---

## Release Process

1. Create `release/vX.X.X` from `dev`.
2. Update `CHANGELOG.md` and version numbers.
3. Run full test suite + E2E.
4. Merge release branch to `main`.
5. Create annotated tag `vX.X.X`.
6. Deploy from `main`.

---

## Questions?

Open a discussion or tag the maintainer in the relevant issue/PR. We prefer async communication through GitHub.
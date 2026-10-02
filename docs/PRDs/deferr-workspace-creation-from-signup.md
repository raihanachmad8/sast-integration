# [feat] Defer Workspace Creation from Signup to First Visit

## Objective

Remove automatic personal workspace creation during signup. Instead, users create their own workspace when they first visit `/workspaces`. Once created, the create action disappears — each user gets exactly one personal workspace.

---

## Scope

### Backend Changes

| # | Change | File | Detail |
|---|--------|------|--------|
| 1 | Remove `ensurePersonalWorkspace` from signup | `src/server/modules/auth/services/auth.service.ts` → `signup()` | Delete lines 115-120 (the `ensurePersonalWorkspace` call + `currentWorkspaceId` update). User is created with `currentWorkspaceId = null`. |
| 2 | Remove `ensurePersonalWorkspace` from `acceptInvite` | `src/server/modules/auth/services/auth.service.ts` → `acceptInvite()` | Delete line 347 (`ensurePersonalWorkspace` call). Invited users join the inviting workspace directly without auto-creating a personal workspace. |
| 3 | Keep `ensurePersonalWorkspace` helper | `src/server/modules/auth/services/auth.service.ts` | Keep the function itself — it is still used by `workspaceService.create()` if needed elsewhere. Or remove if fully unused. |
| 4 | Workspace creation already guarded | `src/server/modules/workspace/workspace.service.ts` → `create()` | Already throws 409 `PERSONAL_EXISTS` if user has an active personal workspace. No change needed. |

### Frontend Changes

| # | Change | File | Detail |
|---|--------|------|--------|
| 5 | Update signup subtitle | `src/app/(unauthenticated)/auth/signup/page.tsx` | Change `"A Personal Workspace will be available immediately."` → `"Create your workspace after signing in."` |
| 6 | Update empty state text (MULTIPLE mode) | `src/app/(authenticated)/workspaces/page.tsx` | Change step 1 text from `"New self-service accounts receive one personal workspace automatically during signup."` → `"Create your personal workspace to get started. You can only have one."` |
| 7 | Hide create button after creation | `src/app/(authenticated)/workspaces/page.tsx` | Already works — `canCreatePersonal` is `true` only when `workspaces.data.length === 0`. After creation, the user has 1 workspace, so the empty state is never shown. The create button is already hidden. No change needed. |

### What Stays the Same

- `workspaceService.create()` logic (type must be `personal`, one per user, slug generation)
- `WORKSPACE_MODE.SINGLE` behavior (signup blocked, invitation-only)
- Workspace chooser page when user already has workspaces (grid of cards)
- Seed script (org workspace in single mode)

---

## Out of Scope

- Renaming personal workspace after creation (separate feature)
- Deleting personal workspace (currently blocked by `CANNOT_DELETE_PERSONAL`)
- Allowing multiple personal workspaces
- Workspace creation form with custom name (currently hardcoded to "Personal Workspace")
- Changing the redirect after signup (still goes to `/auth/signin`)

---

## Acceptance Criteria

- [ ] `POST /api/v1/auth/signup` creates user with `currentWorkspaceId = null` (no workspace)
- [ ] `POST /api/v1/auth/invite/accept` creates/links user to invited workspace without creating a personal workspace
- [ ] Signup page subtitle says "Create your workspace after signing in."
- [ ] `/workspaces` empty state in MULTIPLE mode shows "Create your personal workspace to get started. You can only have one."
- [ ] "Create personal workspace" button appears on `/workspaces` when user has 0 workspaces
- [ ] After creating workspace, user is redirected to dashboard and button is gone
- [ ] Creating a second workspace returns 409 (already works)
- [ ] `WORKSPACE_MODE.SINGLE` signup still blocked (no regression)
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes with 0 errors

---

## Technical Notes

### Why `currentWorkspaceId = null` is safe

- `authService.signin()` already handles `currentWorkspaceId = null` — returns `workspace: null` in response
- Frontend session query handles missing workspace — redirects to `/workspaces`
- The workspace chooser page is the designated landing for users without a workspace

### `acceptInvite` change rationale

Currently `acceptInvite` calls `ensurePersonalWorkspace` (line 347) which creates a personal workspace for the invited user. This is unnecessary — the user is joining an existing workspace via invitation. They can create their personal workspace later from `/workspaces` if they want one.

### Files Modified (estimated)

| File | Lines Changed |
|------|--------------|
| `src/server/modules/auth/services/auth.service.ts` | ~10 lines removed |
| `src/app/(unauthenticated)/auth/signup/page.tsx` | 1 line (subtitle) |
| `src/app/(authenticated)/workspaces/page.tsx` | 1 line (empty state text) |

**Total**: ~12 lines across 3 files

---

## Verification Plan

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes with 0 errors
- [ ] Manual test: signup → verify `currentWorkspaceId` is null in DB
- [ ] Manual test: navigate to `/workspaces` → see create button
- [ ] Manual test: create workspace → redirected to dashboard, no create button
- [ ] Manual test: try create again → 409 error
- [ ] Manual test: accept invitation → no personal workspace auto-created
- [ ] Manual test: `WORKSPACE_MODE=single` signup still blocked

---

## Git & PR Information

**Branch:** `feature/defer-workspace-creation`  
**Base:** `dev`  
**Related Issue:** TBD

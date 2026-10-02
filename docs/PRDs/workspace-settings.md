# [feat] Workspace Settings Page

## Objective

Add a workspace settings page where Owner/Manager users can edit workspace name, description, and view workspace metadata. Currently there is no way to rename a workspace from the UI.

---

## Scope

### Backend (already exists — no changes)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `PATCH /api/v1/workspaces/:id` | PATCH | Update workspace name, description, slug |

The `workspaceService.update()` already supports: `name`, `slug`, `description`. Only owner can update.

### Frontend (new)

| # | Component | File | Detail |
|---|-----------|------|--------|
| 1 | Settings page | `src/app/(authenticated)/[workspace]/settings/page.tsx` | New route. Form with workspace name, description, slug fields. |
| 2 | Workspace info section | Inside settings page | Display: workspace type, created date, member count, slug |
| 3 | Danger zone | Inside settings page | Leave workspace button (for non-owners), delete workspace (owner only, org type only) |
| 4 | API client hook | `src/modules/workspace/api.ts` | Add `updateWorkspace` function (if not exists) |
| 5 | React Query hooks | `src/modules/workspace/queries.ts` | Add `useUpdateWorkspaceMutation` |

### UI Behavior

**Settings form**:
- `name` — text input, required
- `description` — textarea, optional
- `slug` — text input, auto-generated from name, editable
- Save button → `PATCH /api/v1/workspaces/:id`
- Only Owner can edit. Manager can view but fields are disabled.

**Workspace info** (read-only):
- Type: Personal / Organization
- Created: date
- Members: count
- Slug: displayed as `/workspace-slug`

**Danger zone**:
- "Leave workspace" — for members who are not owner
- "Delete workspace" — owner only, organization type only (personal cannot be deleted)

---

## Out of Scope

- Workspace avatar/icon customization
- Workspace billing/plan
- Workspace transfer ownership
- Workspace archival

---

## Acceptance Criteria

- [ ] Settings page exists at `/:workspace/settings`
- [ ] Form loads current workspace data from session/cache
- [ ] Name and description editable, slug auto-generated
- [ ] Save button persists changes via PATCH
- [ ] Only Owner can edit fields (Manager sees disabled form)
- [ ] Workspace info shows type, created date, member count
- [ ] Danger zone: leave (non-owners), delete (owner, org only)
- [ ] Navigation link to settings from workspace header or sidebar
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---

## Technical Notes

- Reuse `useSessionQuery` to get current workspace data
- Follow form pattern from `EditProjectPage` or `ProjectForm`
- The `workspaceService.update()` already validates ownership
- Personal workspaces cannot be deleted (existing rule)
- Settings page should be listed in the sidebar or accessible from workspace header

---

## Verification Plan

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Manual: Owner can edit name/description → save → changes persist
- [ ] Manual: Manager sees disabled fields
- [ ] Manual: non-owner sees "Leave workspace" button
- [ ] Manual: owner of org workspace sees "Delete workspace" button
- [ ] Manual: owner of personal workspace does NOT see delete button

---

## Git & PR Information

**Branch:** `feature/workspace-settings`  
**Base:** `dev`  
**Related Issue:** TBD

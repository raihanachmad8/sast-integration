# [feat] Project API Tokens Management UI

## Objective

Add a UI section to the project detail page where Manager+ users can create, view, and revoke CI API tokens (`sast_p_` prefixed). Tokens are used by CI pipelines to authenticate with the upload endpoint.

---

## Scope

### Backend (already exists — no changes)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/projects/:projectId/api-tokens` | GET | List all tokens (active + revoked) |
| `/api/v1/projects/:projectId/api-tokens` | POST | Create token (returns raw value **once**) |
| `/api/v1/projects/:projectId/api-tokens/:tokenId` | DELETE | Revoke token |

### Frontend (new)

| # | Component | File | Detail |
|---|-----------|------|--------|
| 1 | API Tokens tab/section | `src/features/projects/ProjectApiTokens.tsx` | New component. Table listing tokens with name, prefix, created date, status (active/revoked), revoke button. |
| 2 | Create token modal | Inside `ProjectApiTokens.tsx` | Form with `name` field. On submit, show raw token in a one-time disclosure banner (copy button). |
| 3 | Integrate into project edit page | `src/features/projects/EditProjectPage.tsx` | Add "API Tokens" tab or section below the project form. |
| 4 | API client hook | `src/modules/projects/api.ts` | Add `listApiTokens`, `createApiToken`, `revokeApiToken` functions. |
| 5 | React Query hooks | `src/modules/projects/queries.ts` | Add `useApiTokensQuery`, `useCreateApiTokenMutation`, `useRevokeApiTokenMutation`. |

### UI Behavior

- **Token list table**: Columns — Name, Token prefix (`sast_p_...****`), Created, Status, Actions (Revoke)
- **Create modal**: Input `name` → POST → show raw token with copy button + warning "This token will not be shown again"
- **Revoke**: Confirmation modal → DELETE → token removed from list
- **Permissions**: Only Manager+ can create/revoke. Member+ can view list.

---

## Out of Scope

- Token editing (tokens are immutable — revoke + create new)
- Token usage analytics
- Personal access tokens UI (different feature)

---

## Acceptance Criteria

- [ ] Project edit page has an "API Tokens" section
- [ ] Token list shows all tokens with name, prefix, status, created date
- [ ] Create token modal with name input
- [ ] After creation, raw token shown once with copy button
- [ ] Revoke button with confirmation modal
- [ ] Revoked tokens shown in list with "Revoked" pill
- [ ] Only Manager+ can see create/revoke buttons
- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes

---

## Technical Notes

- Follow existing patterns from `MemberSummaryCards` and `InvitationsTable` for list + action UI
- Use `summary-card` for token count stats
- Token prefix display: `sast_p_****` (hide middle chars)
- One-time token display: use a styled banner with copy-to-clipboard (similar to invite token flow)

---

## Verification Plan

- [ ] `pnpm build` passes
- [ ] `pnpm lint` passes
- [ ] Manual: create token → see raw value once → copy works
- [ ] Manual: list shows token with prefix
- [ ] Manual: revoke → confirmation → token marked revoked
- [ ] Manual: Member role cannot see create/revoke buttons

---

## Git & PR Information

**Branch:** `feature/project-api-tokens-ui`  
**Base:** `dev`  
**Related Issue:** TBD

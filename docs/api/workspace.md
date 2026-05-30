# Workspace API Contract

Module: `workspace`
Base: `/api/v1`

---

## GET /workspaces

List all workspaces the authenticated user belongs to.

**Auth:** Bearer token required

**Success (200):**
```json
{
  "success": true,
  "message": "Workspaces retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "My Team",
      "slug": "my-team",
      "type": "organization",
      "description": "Team workspace",
      "avatarUrl": null,
      "role": "owner",
      "joinedAt": "2026-05-29T10:00:00.000Z"
    }
  ],
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

---

## POST /workspaces

Create a new workspace. Creator becomes owner.

**Auth:** Bearer token required

**Request:**
```json
{
  "name": "New Workspace",
  "slug": "new-workspace",
  "description": "Optional description"
}
```

**Validation:**
| Field | Rules |
|-------|-------|
| name | required, min 2, max 255 |
| slug | optional, lowercase alphanumeric + hyphens, auto-generated from name if omitted |
| description | optional, max 500 |

**Success (201):**
```json
{
  "success": true,
  "message": "Workspace created",
  "data": {
    "id": "uuid",
    "name": "New Workspace",
    "slug": "new-workspace",
    "type": "organization"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 409 | WORKSPACE_ERROR | Workspace slug already exists |
| 422 | VALIDATION_ERROR | Validation failed |

---

## GET /workspaces/:id

Get workspace details. User must be a member.

**Auth:** Bearer token required

**Success (200):**
```json
{
  "success": true,
  "message": "Workspace retrieved",
  "data": {
    "id": "uuid",
    "name": "My Team",
    "slug": "my-team",
    "type": "organization",
    "description": "...",
    "role": "owner"
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | You are not a member of this workspace |
| 404 | WORKSPACE_ERROR | Workspace not found |

---

## PATCH /workspaces/:id

Update workspace name, slug, or description. Owner only.

**Auth:** Bearer token required

**Request:**
```json
{
  "name": "Updated Name",
  "slug": "updated-slug"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Workspace updated",
  "data": { "id": "uuid", "name": "Updated Name", "slug": "updated-slug" },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | Only workspace owner can perform this action |
| 409 | WORKSPACE_ERROR | Workspace slug already exists |

---

## DELETE /workspaces/:id

Soft-delete workspace. Owner only. Personal workspace cannot be deleted.

**Auth:** Bearer token required

**Success (200):**
```json
{
  "success": true,
  "message": "Workspace deleted",
  "data": null,
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | Personal workspace cannot be deleted |
| 403 | WORKSPACE_ERROR | Only workspace owner can perform this action |
| 404 | WORKSPACE_ERROR | Workspace not found |

---

## PATCH /users/me

Switch active workspace. User must be a member of target workspace.

**Auth:** Bearer token required

**Request:**
```json
{
  "currentWorkspaceId": "uuid"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Workspace switched",
  "data": { "currentWorkspaceId": "uuid" },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | You are not a member of this workspace |
| 422 | VALIDATION_ERROR | Validation failed |

---

## Permission Middleware

Workspace-scoped endpoints use `X-Workspace-Id` header + role check:

```
requireWorkspaceRole(request, auth, ROLE.MANAGER)
```

**Role hierarchy:** owner > manager > reviewer > member

| Role | Can manage members | Can run scans | Can view findings |
|------|-------------------|---------------|-------------------|
| owner | ✅ | ✅ | ✅ |
| manager | ✅ | ✅ | ✅ |
| reviewer | ❌ | ❌ | ✅ |
| member | ❌ | ❌ | ✅ |

---

## GET /workspaces/:id/members

List all members of a workspace.

**Auth:** Bearer token
**Permission:** Any workspace member

**Success (200):**
```json
{
  "success": true,
  "message": "Members retrieved",
  "data": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "User Name",
      "avatarUrl": null,
      "role": "owner",
      "joinedAt": "2026-05-30T00:00:00.000Z"
    }
  ]
}
```

---

## PATCH /workspaces/:id/members/:userId

Change a member's role.

**Auth:** Bearer token
**Permission:** Owner only

**Request:**
```json
{
  "role": "manager" | "reviewer" | "member"
}
```

**Success (200):**
```json
{
  "success": true,
  "message": "Member role updated",
  "data": { "userId": "uuid", "role": "manager" }
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | Cannot change your own role |
| 403 | WORKSPACE_ERROR | Cannot assign owner role via API |
| 403 | WORKSPACE_ERROR | Cannot change workspace owner role |
| 404 | WORKSPACE_ERROR | Member not found in workspace |

---

## DELETE /workspaces/:id/members/:userId

Remove a member from workspace.

**Auth:** Bearer token
**Permission:** Owner or Manager

**Success (200):**
```json
{
  "success": true,
  "message": "Member removed",
  "data": null
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 403 | WORKSPACE_ERROR | Cannot remove yourself from workspace |
| 403 | WORKSPACE_ERROR | Cannot remove workspace owner |
| 404 | WORKSPACE_ERROR | Member not found in workspace |

---

## GET /workspaces/:id/invitations

List pending (not accepted, not expired) invitations.

**Auth:** Bearer token
**Permission:** Owner or Manager

**Success (200):**
```json
{
  "success": true,
  "message": "Invitations retrieved",
  "data": [
    {
      "id": "uuid",
      "email": "invited@example.com",
      "role": "reviewer",
      "createdAt": "2026-05-30T00:00:00.000Z",
      "expiresAt": "2026-06-06T00:00:00.000Z"
    }
  ]
}
```

---

## DELETE /workspaces/:id/invitations/:invitationId

Revoke a pending invitation.

**Auth:** Bearer token
**Permission:** Owner or Manager

**Success (200):**
```json
{
  "success": true,
  "message": "Invitation revoked",
  "data": null
}
```

**Errors:**
| Status | Code | Message |
|--------|------|---------|
| 404 | WORKSPACE_ERROR | Invitation not found |

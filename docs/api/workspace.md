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

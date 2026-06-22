# Members API

Module: `members`
Base: `/api/v1/workspaces/:workspaceId/members`

---

## GET /members

List all members of a workspace.

**Auth:** Bearer token
**Required Role:** Member+ (MEMBER_MANAGE permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name or email |
| `role` | string | No | Filter by role: `owner`, `manager`, `reviewer`, `member` |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Members retrieved",
  "data": [
    {
      "userId": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "avatarUrl": null,
      "role": "owner",
      "joinedAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 50,
    "total": 10,
    "totalPages": 1
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## PATCH /members/:userId

Change a member's role.

**Auth:** Bearer token
**Required Role:** Owner only

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `userId` | uuid | User ID |

**Request Body:**
```json
{
  "role": "manager"
}
```

**Allowed Roles:** `manager`, `reviewer`, `member`

**Response Data:**
```json
{
  "success": true,
  "message": "Member role updated",
  "data": {
    "userId": "uuid",
    "role": "manager"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden (not owner, cannot change own role, cannot assign owner) |
| 404 | Member not found |
| 500 | Internal Server Error |

---

## DELETE /members/:userId

Remove a member from the workspace.

**Auth:** Bearer token
**Required Role:** Owner or Manager (MEMBER_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `userId` | uuid | User ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Member removed",
  "data": {
    "userId": "uuid"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden (cannot remove yourself or workspace owner) |
| 404 | Member not found |
| 500 | Internal Server Error |

---

## POST /members/invite

Send a workspace invitation to a user.

**Auth:** Bearer token
**Required Role:** Manager+ (MEMBER_MANAGE permission)

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Allowed Roles:** `manager`, `reviewer`, `member`

**Response Data:**
```json
{
  "success": true,
  "message": "Invitation sent",
  "data": {
    "email": "newuser@example.com"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /members/invitations

List pending (not accepted, not expired) invitations.

**Auth:** Bearer token
**Required Role:** Manager+ (MEMBER_MANAGE permission)

**Response Data:**
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

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## DELETE /members/invitations/:invitationId

Revoke a pending invitation.

**Auth:** Bearer token
**Required Role:** Manager+ (MEMBER_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `invitationId` | uuid | Invitation ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Invitation revoked",
  "data": null
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Invitation not found |
| 500 | Internal Server Error |

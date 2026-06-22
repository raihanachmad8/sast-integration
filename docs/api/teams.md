# Teams API

Module: `teams`
Base: `/api/v1/workspaces/:workspaceId/teams`

---

## GET /teams

List teams in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (TEAM_MANAGE permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name or description |
| `project` | string | No | Filter by project ID |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Teams retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "Security Team",
      "slug": "security-team",
      "description": "Application security team",
      "memberCount": 5,
      "projectIds": ["uuid"],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 50,
    "total": 3,
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

## POST /teams

Create a new team.

**Auth:** Bearer token
**Required Role:** Manager+ (TEAM_MANAGE permission)

**Request Body:**
```json
{
  "name": "Security Team",
  "slug": "security-team",
  "description": "Application security team",
  "memberIds": ["uuid1", "uuid2"]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Team created",
  "data": {
    "id": "uuid",
    "name": "Security Team",
    "slug": "security-team",
    "description": "Application security team",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 409 | Conflict (slug already exists) |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /teams/:teamId

Get team detail.

**Auth:** Bearer token
**Required Role:** Member+ (TEAM_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `teamId` | uuid | Team ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Team retrieved",
  "data": {
    "id": "uuid",
    "name": "Security Team",
    "slug": "security-team",
    "description": "Application security team",
    "memberIds": ["uuid1", "uuid2"],
    "projectIds": ["uuid"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Team not found |
| 500 | Internal Server Error |

---

## PUT /teams/:teamId

Update a team.

**Auth:** Bearer token
**Required Role:** Manager+ (TEAM_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `teamId` | uuid | Team ID |

**Request Body:**
```json
{
  "name": "Updated Team Name",
  "description": "Updated description",
  "memberIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Team updated",
  "data": {
    "id": "uuid",
    "name": "Updated Team Name",
    "description": "Updated description",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Team not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /teams/:teamId

Soft-delete a team.

**Auth:** Bearer token
**Required Role:** Manager+ (TEAM_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `teamId` | uuid | Team ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Team not found |
| 500 | Internal Server Error |

---

## GET /teams/:teamId/members

List team members.

**Auth:** Bearer token
**Required Role:** Member+ (TEAM_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `teamId` | uuid | Team ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Team members retrieved",
  "data": [
    {
      "userId": "uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "avatarUrl": null,
      "role": "member",
      "joinedAt": "2026-01-01T00:00:00.000Z"
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
| 404 | Team not found |
| 500 | Internal Server Error |

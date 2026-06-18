# Projects API

Module: `projects`
Base: `/api/v1/workspaces/:workspaceId/projects`

---

## GET /projects

List projects in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (PROJECT_MANAGE permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by name or description |
| `repository` | string | No | Filter by repository ID |
| `team` | string | No | Filter by team ID |
| `member` | string | No | Filter by member ID |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Projects retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "My App",
      "slug": "my-app",
      "description": "Web application",
      "platform": "web",
      "language": "typescript",
      "teamIds": ["uuid"],
      "memberIds": ["uuid"],
      "repositoryIds": ["uuid"],
      "createdAt": "2026-01-01T00:00:00.000Z"
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

## POST /projects

Create a new project.

**Auth:** Bearer token
**Required Role:** Manager+ (PROJECT_MANAGE permission)

**Request Body:**
```json
{
  "name": "My App",
  "slug": "my-app",
  "description": "Web application",
  "lead": "uuid",
  "platform": "web",
  "language": "typescript",
  "teamIds": ["uuid"],
  "memberIds": ["uuid"],
  "repositoryIds": ["uuid"]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Project created",
  "data": {
    "id": "uuid",
    "name": "My App",
    "slug": "my-app",
    "description": "Web application",
    "platform": "web",
    "language": "typescript",
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

## GET /projects/:projectId

Get project detail.

**Auth:** Bearer token
**Required Role:** Member+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Project retrieved",
  "data": {
    "id": "uuid",
    "name": "My App",
    "slug": "my-app",
    "description": "Web application",
    "platform": "web",
    "language": "typescript",
    "teamIds": ["uuid"],
    "memberIds": ["uuid"],
    "repositoryIds": ["uuid"],
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
| 404 | Project not found |
| 500 | Internal Server Error |

---

## PUT /projects/:projectId

Update a project.

**Auth:** Bearer token
**Required Role:** Manager+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |

**Request Body:**
```json
{
  "name": "Updated App",
  "description": "Updated description",
  "platform": "web",
  "language": "typescript",
  "teamIds": ["uuid"],
  "memberIds": ["uuid"],
  "repositoryIds": ["uuid"]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Project updated",
  "data": {
    "id": "uuid",
    "name": "Updated App",
    "slug": "my-app",
    "description": "Updated description"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Project not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /projects/:projectId

Soft-delete a project.

**Auth:** Bearer token
**Required Role:** Manager+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Project not found |
| 500 | Internal Server Error |

---

## GET /projects/:projectId/api-tokens

List API tokens for a project.

**Auth:** Bearer token
**Required Role:** Member+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "API tokens retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "CI Token",
      "permissions": ["scans:upload"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "expiresAt": "2027-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 50,
    "total": 1,
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
| 404 | Project not found |
| 500 | Internal Server Error |

---

## POST /projects/:projectId/api-tokens

Create an API token for a project.

**Auth:** Bearer token
**Required Role:** Manager+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |

**Request Body:**
```json
{
  "name": "CI Token",
  "permissions": ["scans:upload"],
  "expiresInDays": 365
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "API token created",
  "data": {
    "token": {
      "id": "uuid",
      "name": "CI Token",
      "permissions": ["scans:upload"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "expiresAt": "2027-01-01T00:00:00.000Z"
    },
    "rawValue": "sast_p_..."
  }
}
```

> **Note:** `rawValue` is only returned on creation — store it immediately.

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Project not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /projects/:projectId/api-tokens/:tokenId

Revoke an API token.

**Auth:** Bearer token
**Required Role:** Manager+ (PROJECT_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `projectId` | uuid | Project ID |
| `tokenId` | uuid | Token ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Token not found |
| 500 | Internal Server Error |

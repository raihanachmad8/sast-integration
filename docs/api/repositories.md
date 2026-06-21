# Repositories API

Module: `repositories`
Base: `/api/v1/workspaces/:workspaceId/repositories`

---

## GET /repositories

List all discovered/imported repositories in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (REPOSITORY_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `imported` | string | No | `true` for imported repos only, `false` for manually connected |

**Response Data:**
```json
{
  "success": true,
  "message": "Repositories retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "backend-api",
      "fullName": "org/backend-api",
      "url": "https://github.com/org/backend-api",
      "defaultBranch": "main",
      "visibility": "private",
      "imported": true,
      "projectId": "uuid",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 5,
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

## PATCH /repositories/:repoId

Update a repository (e.g., assign to project).

**Auth:** Bearer token
**Required Role:** Manager+ (REPOSITORY_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `repoId` | uuid | Repository ID |

**Request Body:**
```json
{
  "projectId": "uuid"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Repository updated",
  "data": {
    "id": "uuid",
    "name": "backend-api",
    "projectId": "uuid",
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
| 404 | Repository not found |
| 500 | Internal Server Error |

---

## GET /repositories/:repoId/branches

List branches for a repository from its SCM provider.

**Auth:** Bearer token
**Required Role:** Member+ (REPOSITORY_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `repoId` | uuid | Repository ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Branches retrieved",
  "data": [
    {
      "name": "main",
      "isDefault": true,
      "isProtected": false
    },
    {
      "name": "develop",
      "isDefault": false,
      "isProtected": false
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
| 404 | Repository not found |
| 500 | Internal Server Error |

# Source Controls API

Module: `source-controls`
Base: `/api/v1/workspaces/:workspaceId/source-controls`

---

## GET /source-controls

List all source control integrations in a workspace.

**Auth:** Bearer token
**Required Role:** Member+ (INTEGRATION_MANAGE permission)

**Response Data:**
```json
{
  "success": true,
  "message": "Source controls retrieved",
  "data": [
    {
      "id": "uuid",
      "provider": "github",
      "name": "GitHub Org",
      "status": "active",
      "createdAt": "2026-01-01T00:00:00.000Z"
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

## POST /source-controls

Create a new source control integration.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Request Body:**
```json
{
  "provider": "github",
  "name": "GitHub Org",
  "credentials": {
    "token": "ghp_..."
  }
}
```

**Providers:** `github`, `gitlab`, `gitea`, `bitbucket`, `azure-devops`

**Response Data:**
```json
{
  "success": true,
  "message": "Source control created",
  "data": {
    "sourceControl": {
      "id": "uuid",
      "provider": "github",
      "name": "GitHub Org",
      "status": "pending"
    },
    "redirectUrl": "https://github.com/login/oauth/authorize?..."
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /source-controls/:providerId

Get a single source control integration.

**Auth:** Bearer token
**Required Role:** Member+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Source control retrieved",
  "data": {
    "id": "uuid",
    "provider": "github",
    "name": "GitHub Org",
    "status": "active",
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
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## PATCH /source-controls/:providerId

Update a source control integration.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Request Body:**
```json
{
  "name": "Updated Name",
  "credentials": {
    "token": "new_token"
  }
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Source control updated",
  "data": {
    "sourceControl": {
      "id": "uuid",
      "provider": "github",
      "name": "Updated Name",
      "status": "active"
    },
    "redirectUrl": "https://github.com/login/oauth/authorize?..."
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Source control not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /source-controls/:providerId

Delete a source control integration permanently.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## PATCH /source-controls/:providerId/disconnect

Disconnect a source control integration by clearing credentials. The provider remains in the list but status changes to "Disconnected". Can be reconnected later.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Request Body:**
```json
{
  "credentials": {}
}
```

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## POST /source-controls/:providerId/test

Test connection to a source control provider.

**Auth:** Bearer token
**Required Role:** Member+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Connection test completed",
  "data": {
    "configured": true,
    "connected": true,
    "provider": "github"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Source control not configured |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## POST /source-controls/:providerId/sync

Sync repositories from a source control provider.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Repositories synced",
  "data": {
    "discovered": 15,
    "imported": 3
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## POST /source-controls/:providerId/import

Import a discovered repository.

**Auth:** Bearer token
**Required Role:** Manager+ (REPOSITORY_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

**Request Body:**
```json
{
  "sourceRepositoryId": "uuid",
  "projectId": "uuid"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Repository imported",
  "data": {
    "repositoryId": "uuid",
    "importId": "uuid",
    "webhookStatus": "active"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /source-controls/:providerId/repos

List discovered repositories from a source control provider with import status.

**Auth:** Bearer token
**Required Role:** Member+ (INTEGRATION_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `providerId` | uuid | Source control integration ID |

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
      "branch": "main",
      "visibility": "private",
      "externalId": "123456",
      "imported": true,
      "importId": "uuid",
      "repositoryId": "uuid",
      "webhookStatus": "active"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 10,
    "total": 15,
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
| 404 | Source control not found |
| 500 | Internal Server Error |

---

## POST /source-controls/test-event

Validate a synthetic SCM webhook event.

**Auth:** Bearer token
**Required Role:** Manager+ (INTEGRATION_MANAGE permission)

**Request Body:**
```json
{
  "eventType": "push" | "pull_request"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Test event accepted",
  "data": {
    "eventType": "push",
    "receivedAt": "2026-01-01T00:00:00.000Z",
    "status": "accepted"
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

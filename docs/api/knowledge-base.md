# Knowledge Base API

Module: `knowledge-base`
Base: `/api/v1/workspaces/:workspaceId/knowledge-base`

---

## GET /knowledge-base

List knowledge entries in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (KNOWLEDGE_READ permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by title or content |
| `source` | string | No | Filter by source ID |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 25) |

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge entries retrieved",
  "data": [
    {
      "id": "uuid",
      "sourceId": "uuid",
      "cweId": "CWE-79",
      "title": "XSS Vulnerability",
      "content": "Cross-site scripting vulnerability...",
      "severity": "high",
      "remediation": "Sanitize user input...",
      "tags": ["xss", "injection"],
      "muted": false,
      "references": [
        {
          "name": "OWASP",
          "url": "https://owasp.org/..."
        }
      ],
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "perPage": 25,
    "total": 50,
    "totalPages": 2
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

## POST /knowledge-base

Create a new knowledge entry.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Request Body:**
```json
{
  "sourceId": "uuid",
  "cweId": "CWE-79",
  "title": "XSS Vulnerability",
  "content": "Cross-site scripting vulnerability...",
  "severity": "high",
  "remediation": "Sanitize user input...",
  "tags": ["xss", "injection"],
  "muted": false,
  "references": [
    {
      "name": "OWASP",
      "url": "https://owasp.org/..."
    }
  ]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge entry created",
  "data": {
    "id": "uuid",
    "sourceId": "uuid",
    "cweId": "CWE-79",
    "title": "XSS Vulnerability",
    "content": "Cross-site scripting vulnerability...",
    "severity": "high",
    "remediation": "Sanitize user input...",
    "tags": ["xss", "injection"],
    "muted": false,
    "references": [
      {
        "name": "OWASP",
        "url": "https://owasp.org/..."
      }
    ],
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
| 422 | Validation error |
| 500 | Internal Server Error |

---

## GET /knowledge-base/:entryId

Get a knowledge entry.

**Auth:** Bearer token
**Required Role:** Member+ (KNOWLEDGE_READ permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `entryId` | uuid | Knowledge entry ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge entry retrieved",
  "data": {
    "id": "uuid",
    "sourceId": "uuid",
    "cweId": "CWE-79",
    "title": "XSS Vulnerability",
    "content": "Cross-site scripting vulnerability...",
    "severity": "high",
    "remediation": "Sanitize user input...",
    "tags": ["xss", "injection"],
    "muted": false,
    "references": [
      {
        "name": "OWASP",
        "url": "https://owasp.org/..."
      }
    ],
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
| 404 | Knowledge entry not found |
| 500 | Internal Server Error |

---

## PATCH /knowledge-base/:entryId

Update a knowledge entry.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `entryId` | uuid | Knowledge entry ID |

**Request Body:**
```json
{
  "title": "Updated Title",
  "content": "Updated content...",
  "severity": "critical",
  "remediation": "Updated remediation...",
  "tags": ["xss", "injection", "critical"],
  "muted": true
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge entry updated",
  "data": {
    "id": "uuid",
    "title": "Updated Title",
    "content": "Updated content...",
    "severity": "critical",
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
| 404 | Knowledge entry not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

## DELETE /knowledge-base/:entryId

Delete a knowledge entry.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `entryId` | uuid | Knowledge entry ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Knowledge entry not found |
| 500 | Internal Server Error |

---

## Knowledge Sources

### GET /knowledge-sources

List knowledge sources in the workspace.

**Auth:** Bearer token
**Required Role:** Member+ (KNOWLEDGE_READ permission)

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge sources retrieved",
  "data": [
    {
      "id": "uuid",
      "name": "NVD Database",
      "type": "nvd",
      "url": "https://nvd.nist.gov/...",
      "status": "active",
      "lastSyncAt": "2026-01-01T00:00:00.000Z",
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

### POST /knowledge-sources

Create a new knowledge source.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Request Body:**
```json
{
  "name": "NVD Database",
  "type": "nvd",
  "url": "https://nvd.nist.gov/..."
}
```

**Types:** `cwe`, `nvd`, `custom`

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge source created",
  "data": {
    "id": "uuid",
    "name": "NVD Database",
    "type": "nvd",
    "url": "https://nvd.nist.gov/...",
    "status": "pending",
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
| 422 | Validation error |
| 500 | Internal Server Error |

---

### GET /knowledge-sources/:sourceId

Get a knowledge source.

**Auth:** Bearer token
**Required Role:** Member+ (KNOWLEDGE_READ permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge source retrieved",
  "data": {
    "id": "uuid",
    "name": "NVD Database",
    "type": "nvd",
    "url": "https://nvd.nist.gov/...",
    "status": "active",
    "lastSyncAt": "2026-01-01T00:00:00.000Z",
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
| 404 | Knowledge source not found |
| 500 | Internal Server Error |

---

### PATCH /knowledge-sources/:sourceId

Update a knowledge source.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Request Body:**
```json
{
  "name": "Updated NVD Database",
  "url": "https://updated-url.example.com"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge source updated",
  "data": {
    "id": "uuid",
    "name": "Updated NVD Database",
    "url": "https://updated-url.example.com",
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
| 404 | Knowledge source not found |
| 422 | Validation error |
| 500 | Internal Server Error |

---

### DELETE /knowledge-sources/:sourceId

Delete a knowledge source.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Response Data:** No Content (204)

**Status Codes:**
| Code | Description |
|------|-------------|
| 204 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Knowledge source not found |
| 500 | Internal Server Error |

---

### POST /knowledge-sources/:sourceId/sync

Trigger sync for a knowledge source.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Sync triggered",
  "data": {
    "entriesAdded": 150,
    "entriesUpdated": 25
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Knowledge source not found |
| 500 | Internal Server Error |

---

### GET /knowledge-sources/:sourceId/backfill

Get backfill status for a knowledge source.

**Auth:** Bearer token
**Required Role:** Member+ (KNOWLEDGE_READ permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge backfill jobs retrieved",
  "data": [
    {
      "id": "uuid",
      "status": "completed",
      "totalEntries": 1000,
      "processedEntries": 1000,
      "progress": 100,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "completedAt": "2026-01-01T01:00:00.000Z"
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
| 404 | Knowledge source not found |
| 500 | Internal Server Error |

---

### POST /knowledge-sources/:sourceId/backfill

Start or resume NVD historical backfill.

**Auth:** Bearer token
**Required Role:** Manager+ (KNOWLEDGE_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `sourceId` | uuid | Knowledge source ID |

**Request Body (optional):**
```json
{
  "resume": true
}
```

> **Note:** If `resume: true` is provided, resumes the latest failed job. Otherwise starts a new backfill.

**Response Data:**
```json
{
  "success": true,
  "message": "Knowledge backfill queued",
  "data": {
    "id": "uuid",
    "status": "queued",
    "totalEntries": 0,
    "processedEntries": 0,
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
| 404 | Knowledge source not found |
| 500 | Internal Server Error |

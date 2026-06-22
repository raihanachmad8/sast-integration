# Findings API

Module: `findings`
Base: `/api/v1/workspaces/:workspaceId/findings`

---

## GET /findings

List findings with optional filters.

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | uuid | No | Filter by project |
| `scanId` | uuid | No | Filter by scan |
| `status` | string | No | `open`, `fixed`, `false_positive`, `ignored` |
| `severity` | string | No | `critical`, `high`, `medium`, `low`, `info` |
| `scanner` | string | No | Scanner name |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Findings retrieved",
  "data": [
    {
      "id": "uuid",
      "scanId": "uuid",
      "scanner": "semgrep",
      "rule": "javascript.lang.security.audit.xss",
      "severity": "high",
      "status": "open",
      "message": "Potential XSS vulnerability",
      "filePath": "src/app.ts",
      "lineNumber": 42,
      "cweId": "CWE-79",
      "verdict": "TP",
      "confidence": "95",
      "assignedTo": null
    }
  ],
  "meta": {
    "requestId": "...",
    "timestamp": "...",
    "page": 1,
    "perPage": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden (insufficient permissions) |
| 500 | Internal Server Error |

---

## GET /findings/:findingId

Get a single finding with AI verifications.

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `findingId` | uuid | Finding ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Finding retrieved",
  "data": {
    "id": "uuid",
    "scanId": "uuid",
    "scanner": "semgrep",
    "rule": "javascript.lang.security.audit.xss",
    "severity": "high",
    "status": "open",
    "message": "Potential XSS vulnerability",
    "filePath": "src/app.ts",
    "lineNumber": 42,
    "cweId": "CWE-79",
    "verdict": "TP",
    "confidence": "95",
    "assignedTo": null,
    "verifications": []
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Finding not found |
| 500 | Internal Server Error |

---

## PATCH /findings/:findingId

Update finding status, verdict, or assignment.

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_TRIAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `findingId` | uuid | Finding ID |

**Request Body:**
```json
{
  "status": "fixed" | "open" | "false_positive" | "ignored",
  "verdict": "TP" | "FP" | "Uncertain",
  "assignedTo": "uuid" | null
}
```

> **Note:** At least one of `status`, `verdict`, or `assignedTo` is required.

**Response Data:**
```json
{
  "success": true,
  "message": "Finding updated",
  "data": {
    "id": "uuid",
    "status": "fixed"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (no valid field provided) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Finding not found |
| 500 | Internal Server Error |

---

## POST /findings/:findingId/verify

Trigger AI verification for a single finding.

**Auth:** Bearer token
**Required Role:** Manager+ (SCANNER_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `findingId` | uuid | Finding ID |

**Request Body:**
```json
{
  "modelId": "uuid"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Verification completed",
  "data": {
    "verdict": "TP",
    "confidence": "95",
    "reasoning": "Input is not properly sanitized before rendering..."
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Finding not found |
| 500 | Internal Server Error |

---

## POST /findings/:findingId/comments

Add a comment to a finding.

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `findingId` | uuid | Finding ID |

**Request Body:**
```json
{
  "content": "This looks like a true positive because the input is not validated"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Comment added",
  "data": {
    "id": "uuid",
    "findingId": "uuid",
    "content": "This looks like a true positive because the input is not validated",
    "createdAt": "2026-06-15T10:00:00Z"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 201 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Finding not found |
| 422 | Validation error (content required, max 5000 chars) |
| 500 | Internal Server Error |

---

## GET /findings/:findingId/comments

List all comments for a finding.

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `findingId` | uuid | Finding ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Comments retrieved",
  "data": [
    {
      "id": "uuid",
      "findingId": "uuid",
      "content": "This looks like a true positive",
      "createdAt": "2026-06-15T10:00:00Z",
      "updatedAt": "2026-06-15T10:00:00Z",
      "createdByName": "John Doe",
      "createdByEmail": "john@example.com"
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
| 404 | Finding not found |
| 500 | Internal Server Error |

---

## PUT /findings/bulk

Bulk update findings (status, assignment).

**Auth:** Bearer token
**Required Role:** Member+ (FINDING_TRIAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Workspace ID |

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "payload": {
    "status": "fixed",
    "assignedTo": null
  }
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Findings updated",
  "data": {
    "updated": 2
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error (at least one ID required) |
| 500 | Internal Server Error |

---

## POST /findings/ai-verify

Batch AI verification for findings in a scan or specific finding IDs.

**Auth:** Bearer token
**Required Role:** Manager+ (SCANNER_MANAGE permission)

**Request Body:**
```json
{
  "scanId": "uuid",
  "modelId": "uuid",
  "findingIds": ["uuid1", "uuid2"]
}
```

> **Note:** Either `scanId` or `findingIds` is required.

**Response Data (scanId provided):**
```json
{
  "success": true,
  "message": "Batch verification completed",
  "data": {
    "total": 10,
    "verified": 8,
    "failed": 2
  }
}
```

**Response Data (findingIds provided):**
```json
{
  "success": true,
  "message": "Verification completed",
  "data": [
    {
      "findingId": "uuid1",
      "verdict": "TP",
      "confidence": "95"
    },
    {
      "findingId": "uuid2",
      "error": "Model unavailable"
    }
  ]
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (neither scanId nor findingIds provided) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

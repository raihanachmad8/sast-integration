# Scans API

Module: `scans`
Base: `/api/v1/workspaces/:workspaceId/scans`

---

## GET /scans

List all scans for the current workspace.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `search` | string | No | Search by repository name |
| `status` | string | No | `queued`, `processing`, `completed`, `failed` |
| `stage` | string | No | `queued`, `scanning`, `parsing`, `completed`, `failed` |
| `origin` | string | No | `managed`, `external_upload` |
| `page` | number | No | Page number (default: 1) |
| `perPage` | number | No | Items per page (default: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Scans retrieved",
  "data": [
    {
      "id": "uuid",
      "repository": "my-app",
      "repoSub": "main • Jan 1, 2026",
      "status": "Completed",
      "stage": "Done",
      "findings": 42,
      "critical": 3,
      "ai": "Pending",
      "origin": "managed",
      "provider": null,
      "connectionType": "scm"
    }
  ],
  "meta": {
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
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## POST /scans

Trigger a new scan for a repository.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_RUN permission)

**Request Body:**
```json
{
  "repositoryId": "uuid",
  "branch": "main",
  "scanners": ["semgrep", "gitleaks"]
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "Scan triggered",
  "data": {
    "scanId": "uuid",
    "status": "queued"
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

## GET /scans/:scanId

Get scan detail with findings count, severity breakdown, and AI stats.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `scanId` | uuid | Scan ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Scan retrieved",
  "data": {
    "id": "uuid",
    "repository": "my-app",
    "branch": "main",
    "commitSha": "abc123",
    "origin": "managed",
    "status": "completed",
    "startedAt": "2026-01-01T00:00:00.000Z",
    "completedAt": "2026-01-01T00:05:00.000Z",
    "durationSeconds": 300,
    "scannerResults": [
      {
        "scanner": "semgrep",
        "format": "json",
        "fileKey": "scans/uuid/results/semgrep.json",
        "fileSize": 1024,
        "summary": {
          "total_findings": 10,
          "critical": 1,
          "high": 3,
          "medium": 4,
          "low": 2
        }
      }
    ],
    "totalFindings": 42,
    "severityBreakdown": {
      "critical": 3,
      "high": 8,
      "medium": 15,
      "low": 12,
      "info": 4
    },
    "timeline": []
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Scan not found |
| 500 | Internal Server Error |

---

## POST /scans/upload

Upload scan results from CI/CD pipelines.

**Auth:** Bearer token (user session) OR Project API token with `scans:upload` permission
**Required Role:** Member+ (SCAN_RUN permission)
**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `projectId` | string | Yes | Project UUID |
| `branch` | string | No | Git branch (default: `main`) |
| `commit` | string | No | Git commit SHA |
| `source` | string | No | Default: `ci_upload` |
| `repositoryUrl` | string | No | Repository URL |
| `repositoryName` | string | No | Repository name |
| `file` | file | Yes* | Scanner output file(s) |

\* At least one file is required.

**Response Data:**
```json
{
  "success": true,
  "message": "Scan results uploaded",
  "data": {
    "scanId": "uuid",
    "status": "processing"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (no files provided) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 422 | Validation error |
| 500 | Internal Server Error |

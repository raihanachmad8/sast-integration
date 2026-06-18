# Dashboard API

Module: `dashboard`
Base: `/api/v1/dashboard`

---

## GET /dashboard/stats

Get dashboard statistics for a workspace.

**Auth:** Bearer token
**Required Role:** Member+ (DASHBOARD_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `workspaceId` | uuid | Yes | Workspace UUID |

**Response Data:**
```json
{
  "success": true,
  "message": "Dashboard stats retrieved",
  "data": {
    "totalScans": 150,
    "completedScans": 145,
    "failedScans": 5,
    "totalFindings": 450,
    "criticalFindings": 12,
    "highFindings": 45,
    "mediumFindings": 150,
    "lowFindings": 180,
    "infoFindings": 63,
    "openFindings": 200,
    "fixedFindings": 150,
    "falsePositiveFindings": 80,
    "ignoredFindings": 20,
    "aiVerifiedFindings": 300,
    "aiPendingFindings": 150
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (workspaceId required) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## GET /dashboard/scans

Get recent scans for the dashboard.

**Auth:** Bearer token
**Required Role:** Member+ (DASHBOARD_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `workspaceId` | uuid | Yes | Workspace UUID |
| `limit` | number | No | Number of recent scans (default: 10, max: 50) |

**Response Data:**
```json
{
  "success": true,
  "message": "Recent scans retrieved",
  "data": [
    {
      "id": "uuid",
      "repository": "backend-api",
      "branch": "main",
      "status": "completed",
      "findings": 42,
      "critical": 3,
      "completedAt": "2026-01-01T00:05:00.000Z"
    }
  ]
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (workspaceId required) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## GET /dashboard/findings

Get findings summary for the dashboard.

**Auth:** Bearer token
**Required Role:** Member+ (DASHBOARD_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `workspaceId` | uuid | Yes | Workspace UUID |

**Response Data:**
```json
{
  "success": true,
  "message": "Findings summary retrieved",
  "data": {
    "bySeverity": {
      "critical": 12,
      "high": 45,
      "medium": 150,
      "low": 180,
      "info": 63
    },
    "byStatus": {
      "open": 200,
      "fixed": 150,
      "false_positive": 80,
      "ignored": 20
    },
    "byScanner": {
      "semgrep": 200,
      "gitleaks": 150,
      "flawfinder": 100
    },
    "byVerdict": {
      "TP": 250,
      "FP": 50,
      "Pending": 150
    }
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (workspaceId required) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

---

## GET /dashboard/health

Get health status for the dashboard.

**Auth:** Bearer token
**Required Role:** Member+ (DASHBOARD_VIEW permission)

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `workspaceId` | uuid | Yes | Workspace UUID |

**Response Data:**
```json
{
  "success": true,
  "message": "Health status retrieved",
  "data": {
    "scannerEngines": {
      "semgrep": "ready",
      "gitleaks": "ready",
      "flawfinder": "not_installed"
    },
    "aiModels": {
      "primary": "reachable",
      "fallback": "unreachable"
    },
    "sourceControls": {
      "github": "active",
      "gitlab": "inactive"
    },
    "systemHealth": "healthy"
  }
}
```

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request (workspaceId required) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 500 | Internal Server Error |

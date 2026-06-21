# Settings API

Module: `settings`
Base: `/api/v1/workspaces/:workspaceId/settings`

---

## GET /settings/verification

Get verification settings for a workspace.

**Auth:** Bearer token
**Required Role:** Owner or Manager (WORKSPACE_SETTINGS permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Workspace ID |

**Response Data:**
```json
{
  "success": true,
  "message": "Settings retrieved",
  "data": {
    "attachKnowledge": true,
    "requireConfidence": true,
    "allowFallback": true,
    "confidenceThreshold": "90",
    "timeout": "90",
    "cweMismatch": "warn"
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

## PUT /settings/verification

Update verification settings for a workspace.

**Auth:** Bearer token
**Required Role:** Owner or Manager (WORKSPACE_SETTINGS permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Workspace ID |

**Request Body:**
```json
{
  "attachKnowledge": true,
  "requireConfidence": true,
  "allowFallback": false,
  "confidenceThreshold": "95",
  "timeout": "120",
  "cweMismatch": "fail"
}
```

**Settings Fields:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `attachKnowledge` | boolean | `true` | Attach knowledge base entries during verification |
| `requireConfidence` | boolean | `true` | Require confidence score from AI |
| `allowFallback` | boolean | `true` | Allow fallback to default model |
| `confidenceThreshold` | string | `"90"` | Minimum confidence threshold (0-100) |
| `timeout` | string | `"90"` | Verification timeout in seconds |
| `cweMismatch` | string | `"warn"` | Action on CWE mismatch: `warn`, `fail`, `ignore` |

**Response Data:**
```json
{
  "success": true,
  "message": "Settings saved",
  "data": {
    "attachKnowledge": true,
    "requireConfidence": true,
    "allowFallback": false,
    "confidenceThreshold": "95",
    "timeout": "120",
    "cweMismatch": "fail"
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

## GET /settings/pr-review

Get PR review settings for a workspace.

**Auth:** Bearer token
**Required Role:** Member+ (SCAN_VIEW permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Workspace ID |

**Response Data:**
```json
{
  "success": true,
  "message": "PR review settings retrieved",
  "data": {
    "enabled": true,
    "autoComment": true,
    "blockMerge": false,
    "severityThreshold": "high",
    "commentFormat": "detailed"
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

## PUT /settings/pr-review

Update PR review settings for a workspace.

**Auth:** Bearer token
**Required Role:** Manager+ (POLICY_MANAGE permission)

**Path Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `workspaceId` | uuid | Workspace ID |

**Request Body:**
```json
{
  "enabled": true,
  "autoComment": true,
  "blockMerge": true,
  "severityThreshold": "medium",
  "commentFormat": "detailed"
}
```

**Response Data:**
```json
{
  "success": true,
  "message": "PR review settings updated",
  "data": {
    "enabled": true,
    "autoComment": true,
    "blockMerge": true,
    "severityThreshold": "medium",
    "commentFormat": "detailed"
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

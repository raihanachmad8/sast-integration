# Activity Logs API

Module: `activity-logs`
Base: `/api/v1/activity-logs`

---

## GET /activity-logs

List activity logs for workspaces the user has access to.

**Auth:** Bearer token

**Query Parameters:**
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | number | No | Max items (default: 50, max: 200) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response Data:**
```json
{
  "success": true,
  "message": "Activity logs retrieved",
  "data": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "type": "scan.completed",
      "description": "Scan completed for repository backend-api",
      "metadata": {
        "scanId": "uuid",
        "repository": "backend-api",
        "branch": "main",
        "findings": 42
      },
      "createdAt": "2026-01-01T00:00:00.000Z"
    },
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "userId": "uuid",
      "type": "finding.verified",
      "description": "AI verification completed for finding",
      "metadata": {
        "findingId": "uuid",
        "verdict": "TP",
        "confidence": "95"
      },
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Common Activity Types:**
| Type | Description |
|------|-------------|
| `scan.completed` | Scan completed successfully |
| `scan.failed` | Scan failed |
| `scan.uploaded` | Scan results uploaded from CI |
| `finding.created` | New finding detected |
| `finding.verified` | AI verification completed |
| `finding.status_changed` | Finding status updated |
| `project.created` | Project created |
| `project.updated` | Project updated |
| `member.joined` | User joined workspace |
| `member.left` | User left workspace |
| `source_control.synced` | Source control synced |
| `webhook.delivered` | Webhook delivered |
| `report.generated` | Report generated |

**Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized |
| 500 | Internal Server Error |
